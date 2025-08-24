import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { json, getClientIp, rateLimit, log } from './_utils';

function signHS256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function signJWT(payload: Record<string, any>, secret: string, ttlMs: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + Math.floor(ttlMs / 1000);
  const body = { ...payload, iat: nowSec, exp };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(body));
  const s = signHS256(`${h}.${p}`, secret);
  return `${h}.${p}.${s}`;
}

const TOKEN_TTL_MS = 60 * 60 * 1000;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, 'Method Not Allowed');
    const { deviceId, code } = JSON.parse(event.body || '{}');
    if (!deviceId || !code) return json(400, { error: 'missing_fields' });

    const ip = getClientIp(event);
    const rl = rateLimit('exchange', ip, 120, 60_000);
    if (!rl.allowed) return json(429, { error: 'rate_limited', retryAfter: rl.retryAfter });

    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, user_id, code_expires_at, linked_at')
      .eq('device_id', deviceId)
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (error || !data) return json(404, { error: 'not_linked' });
    if (!data.linked_at) return json(425, { error: 'not_ready' });
    if (new Date(data.code_expires_at).getTime() < Date.now()) {
      return json(410, { error: 'code_expired' });
    }

    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) return json(500, { error: 'jwt_env_missing' });

    const token = signJWT({ deviceId, userId: data.user_id }, jwtSecret, TOKEN_TTL_MS);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    log(event, 'device_token_issued', { deviceId, userId: data.user_id, ip });
    return json(200, { token, expiresAt });
  } catch (err: any) {
    return json(500, { error: 'server_error', details: err?.message });
  }
};


