import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { json, getClientIp, rateLimit, log } from './_utils';

function randomId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const handler: Handler = async (event) => {
  try {
    // Basic rate limit per IP
    const ip = getClientIp(event);
    const rl = rateLimit('register', ip, 30, 60_000);
    if (!rl.allowed) return json(429, { error: 'rate_limited', retryAfter: rl.retryAfter });

    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !supabaseKey) {
      return json(500, { error: 'supabase_env_missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const deviceId = randomId(8);
    const code = randomId(4).slice(0, 6).toUpperCase();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error } = await supabase.from('devices').insert({
      device_id: deviceId,
      code_hash: codeHash,
      code_expires_at: expiresAt,
    });
    if (error) return json(500, { error: 'insert_failed', details: error.message });

    log(event, 'device_registered', { deviceId, ip });
    return json(200, { deviceId, code, expiresAt });
  } catch (err: any) {
    return json(500, { error: 'server_error', details: err?.message });
  }
};


