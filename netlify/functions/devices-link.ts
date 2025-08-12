import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { json, getClientIp, rateLimit, log } from './_utils';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, 'Method Not Allowed');
    const { code } = JSON.parse(event.body || '{}');
    if (!code) return json(400, { error: 'missing_code' });

    // Rate limit per IP
    const ip = getClientIp(event);
    const rl = rateLimit('link', ip, 60, 60_000);
    if (!rl.allowed) return json(429, { error: 'rate_limited', retryAfter: rl.retryAfter });

    // Verify Clerk session if configured; allow local dev bypass
    const clerkSecret = (process.env.CLERK_SECRET_KEY as string) || '';
    const isLocal = process.env.NETLIFY_LOCAL === 'true';
    let userId: string | null = null;

    const authHeader = (event.headers.authorization || event.headers.Authorization || '').toString();
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (isLocal) {
      // Local dev: accept mock token or x-dev-user-id without calling Clerk
      if (bearer === 'dev-session-token') {
        userId = 'dev-user';
      } else if (!clerkSecret) {
        userId = (event.headers['x-dev-user-id'] as string) || 'dev-user';
      } else {
        // In local dev with Clerk secret, also accept any bearer token for development
        userId = 'dev-user';
      }
    }

    if (!userId && clerkSecret) {
      if (!bearer) return json(401, { error: 'missing_clerk_token' });
      try {
        const res = await fetch('https://api.clerk.com/v1/sessions/verify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clerkSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: bearer }),
        });
        if (!res.ok) return json(401, { error: 'clerk_verify_failed' });
        const verified: { user_id?: string; sub?: string } = await res.json();
        userId = verified?.user_id || verified?.sub || null;
        if (!userId) return json(401, { error: 'clerk_user_missing' });
      } catch (e: unknown) {
        return json(401, { error: 'clerk_error', details: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    if (!userId) {
      // Final fallback (should only happen in local without Clerk)
      userId = (event.headers['x-dev-user-id'] as string) || 'dev-user';
    }

    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const codeHash = hashCode(code);
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, code_expires_at')
      .eq('code_hash', codeHash)
      .limit(1)
      .maybeSingle();

    if (error || !data) return json(404, { error: 'code_not_found' });
    if (new Date(data.code_expires_at).getTime() < Date.now()) {
      return json(410, { error: 'code_expired' });
    }

    const { error: upErr } = await supabase
      .from('devices')
      .update({ user_id: userId, linked_at: new Date().toISOString() })
      .eq('device_id', data.device_id);

    if (upErr) return json(500, { error: 'link_failed', details: upErr.message });
    log(event, 'device_linked', { deviceId: data.device_id, userId, ip });
    return json(200, { ok: true });
  } catch (err: unknown) {
    return json(500, { error: 'server_error', details: err instanceof Error ? err.message : 'Unknown error' });
  }
};


