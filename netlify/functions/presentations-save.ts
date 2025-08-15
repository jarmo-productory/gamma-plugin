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

interface SavePresentationRequest {
  presentationUrl: string;
  title: string;
  timetableData: {
    title: string;
    items: Array<{
      id: string;
      title: string;
      content?: string;
      duration: number;
      startTime?: string;
      endTime?: string;
    }>;
    lastModified: string;
  };
}

export const handler: Handler = async (event) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'method_not_allowed' });
    }

    // Rate limiting per IP
    const ip = getClientIp(event);
    const rl = rateLimit('save-presentation', ip, 10, 60_000); // 10 saves per minute
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

    // Parse and validate request body
    let requestBody: SavePresentationRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { error: 'invalid_json' });
    }

    const { presentationUrl, title, timetableData } = requestBody;

    // Input validation
    if (!presentationUrl || typeof presentationUrl !== 'string') {
      return json(400, { error: 'invalid_presentation_url' });
    }
    if (!title || typeof title !== 'string') {
      return json(400, { error: 'invalid_title' });
    }
    if (!timetableData || typeof timetableData !== 'object') {
      return json(400, { error: 'invalid_timetable_data' });
    }
    if (!timetableData.items || !Array.isArray(timetableData.items)) {
      return json(400, { error: 'invalid_timetable_items' });
    }

    // Additional validation for timetable items
    for (const item of timetableData.items) {
      if (!item.id || !item.title || typeof item.duration !== 'number') {
        return json(400, { error: 'invalid_timetable_item_format' });
      }
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
      log(event, 'presentation_save_failed_no_user', { 
        userId, 
        error: userResult.error 
      });
      return json(404, { error: userResult.error || 'user_not_found' });
    }
    const internalUserId = userResult.userId;
    
    // Log if user was created during this request (indicates missing user from device linking)
    if (userResult.created) {
      log(event, 'user_created_during_presentation_save', { 
        userId, 
        internalUserId,
        note: 'User should have been created during device linking' 
      });
    }

    // Calculate total duration and start time from timetable data
    let totalDuration = 0;
    let startTime = '09:00'; // Default start time

    // Extract start time from first item if available
    if (timetableData.items.length > 0 && timetableData.items[0].startTime) {
      startTime = timetableData.items[0].startTime;
    }

    // Calculate total duration
    for (const item of timetableData.items) {
      totalDuration += item.duration || 0;
    }

    // Upsert presentation data (insert or update if exists)
    const { data: presentationData, error: saveError } = await supabase
      .from('presentations')
      .upsert({
        user_id: internalUserId,
        title: title,
        gamma_url: presentationUrl,
        start_time: startTime,
        total_duration: totalDuration,
        timetable_data: timetableData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'gamma_url'
      })
      .select('id, created_at, updated_at')
      .single();

    if (saveError) {
      log(event, 'save_presentation_failed', { 
        userId, 
        presentationUrl, 
        error: saveError.message 
      });
      return json(500, { error: 'save_failed', details: saveError.message });
    }

    log(event, 'presentation_saved', { 
      userId, 
      deviceId, 
      presentationUrl, 
      title,
      itemCount: timetableData.items.length,
      totalDuration,
      ip 
    });

    return json(200, {
      success: true,
      id: presentationData.id,
      presentationUrl,
      title,
      totalDuration,
      itemCount: timetableData.items.length,
      createdAt: presentationData.created_at,
      updatedAt: presentationData.updated_at,
      syncedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    log(event, 'save_presentation_error', { error: err?.message, stack: err?.stack });
    return json(500, { error: 'server_error', details: err?.message });
  }
};