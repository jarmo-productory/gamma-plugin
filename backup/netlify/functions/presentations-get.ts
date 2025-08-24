import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { json, getClientIp, rateLimit, log } from './_utils';
import { getUserIdFromClerk } from './_user-utils';

function signHS256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

// JWT token verification (same pattern as protected-ping)
function verifyToken(token: string, secret: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return { valid: false, error: 'malformed' };
    
    const expected = signHS256(`${h}.${p}`, secret);
    if (expected !== s) return { valid: false, error: 'bad_signature' };
    
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp * 1000 < Date.now()) return { valid: false, error: 'expired' };
    
    return { valid: true, payload };
  } catch (e: any) {
    return { valid: false, error: 'invalid_token', details: e?.message };
  }
}

export const handler: Handler = async (event) => {
  try {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'method_not_allowed' });
    }

    // Rate limiting per IP
    const ip = getClientIp(event);
    const rl = rateLimit('get-presentation', ip, 30, 60_000); // 30 requests per minute
    if (!rl.allowed) return json(429, { error: 'rate_limited', retryAfter: rl.retryAfter });

    // JWT Authentication
    const secret = process.env.JWT_SECRET as string;
    const auth = event.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return json(401, { error: 'missing_token' });

    const tokenVerification = verifyToken(token, secret);
    if (!tokenVerification.valid) {
      return json(401, { error: tokenVerification.error, details: tokenVerification.details });
    }

    const { deviceId, userId } = tokenVerification.payload;

    // Get presentation URL from query parameters
    const presentationUrl = event.queryStringParameters?.url;
    if (!presentationUrl || typeof presentationUrl !== 'string') {
      return json(400, { error: 'missing_presentation_url' });
    }

    // Setup Supabase client
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !supabaseKey) {
      return json(500, { error: 'supabase_env_missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's internal ID using shared utility (with production-safe fallback)
    const userResult = await getUserIdFromClerk(userId, event);
    if (!userResult.userId) {
      log(event, 'presentation_get_failed_no_user', { 
        userId, 
        error: userResult.error 
      });
      return json(404, { error: userResult.error || 'user_not_found' });
    }
    const internalUserId = userResult.userId;
    
    // Log if user was created during this request (indicates missing user from device linking)
    if (userResult.created) {
      log(event, 'user_created_during_presentation_get', { 
        userId, 
        internalUserId,
        note: 'User should have been created during device linking' 
      });
    }

    // Query presentation data with RLS enforcement
    const { data: presentationData, error: getError } = await supabase
      .from('presentations')
      .select('id, title, gamma_url, start_time, total_duration, timetable_data, created_at, updated_at')
      .eq('user_id', internalUserId)
      .eq('gamma_url', presentationUrl)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') { // No rows returned
        log(event, 'get_presentation_not_found', { userId, presentationUrl });
        return json(404, { error: 'presentation_not_found' });
      }
      
      log(event, 'get_presentation_failed', { 
        userId, 
        presentationUrl, 
        error: getError.message 
      });
      return json(500, { error: 'get_failed', details: getError.message });
    }

    log(event, 'presentation_retrieved', { 
      userId, 
      deviceId, 
      presentationUrl, 
      presentationId: presentationData.id,
      ip 
    });

    return json(200, {
      id: presentationData.id,
      presentationUrl: presentationData.gamma_url,
      title: presentationData.title,
      startTime: presentationData.start_time,
      totalDuration: presentationData.total_duration,
      timetableData: presentationData.timetable_data,
      createdAt: presentationData.created_at,
      updatedAt: presentationData.updated_at,
      syncedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    log(event, 'get_presentation_error', { error: err?.message, stack: err?.stack });
    return json(500, { error: 'server_error', details: err?.message });
  }
};