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
    const rl = rateLimit('list-presentations', ip, 20, 60_000); // 20 requests per minute
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

    // Parse pagination and filtering parameters
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '50'), 100); // Max 100 items
    const offset = Math.max(parseInt(event.queryStringParameters?.offset || '0'), 0);
    const sortBy = event.queryStringParameters?.sortBy || 'updated_at';
    const sortOrder = event.queryStringParameters?.sortOrder === 'asc' ? 'asc' : 'desc';
    
    // Validate sort field
    const allowedSortFields = ['title', 'created_at', 'updated_at', 'total_duration'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'updated_at';

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
      log(event, 'presentation_list_failed_no_user', { 
        userId, 
        error: userResult.error 
      });
      return json(404, { error: userResult.error || 'user_not_found' });
    }
    const internalUserId = userResult.userId;
    
    // Log if user was created during this request (indicates missing user from device linking)
    if (userResult.created) {
      log(event, 'user_created_during_presentation_list', { 
        userId, 
        internalUserId,
        note: 'User should have been created during device linking' 
      });
    }

    // Query presentations with RLS enforcement
    const query = supabase
      .from('presentations')
      .select(`
        id,
        title,
        gamma_url,
        start_time,
        total_duration,
        created_at,
        updated_at,
        timetable_data
      `)
      .eq('user_id', internalUserId)
      .order(validSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: presentations, error: listError } = await query;

    if (listError) {
      log(event, 'list_presentations_failed', { 
        userId, 
        error: listError.message 
      });
      return json(500, { error: 'list_failed', details: listError.message });
    }

    // Transform data for response (include item counts and summary info)
    const presentationList = presentations?.map(p => ({
      id: p.id,
      presentationUrl: p.gamma_url,
      title: p.title,
      startTime: p.start_time,
      totalDuration: p.total_duration,
      itemCount: p.timetable_data?.items?.length || 0,
      lastModified: p.timetable_data?.lastModified || p.updated_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Don't include full timetable data in list view for performance
    })) || [];

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('presentations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', internalUserId);

    log(event, 'presentations_listed', { 
      userId, 
      deviceId, 
      count: presentationList.length,
      totalCount,
      offset,
      limit,
      ip 
    });

    return json(200, {
      presentations: presentationList,
      pagination: {
        offset,
        limit,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > offset + limit,
      },
      meta: {
        sortBy: validSortBy,
        sortOrder,
        retrievedAt: new Date().toISOString(),
      },
    });

  } catch (err: any) {
    log(event, 'list_presentations_error', { error: err?.message, stack: err?.stack });
    return json(500, { error: 'server_error', details: err?.message });
  }
};