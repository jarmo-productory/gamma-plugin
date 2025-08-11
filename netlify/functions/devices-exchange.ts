import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { deviceId, code } = JSON.parse(event.body || '{}');
    if (!deviceId || !code) return { statusCode: 400, body: JSON.stringify({ error: 'missing_fields' }) };

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

    if (error || !data) return { statusCode: 404, body: JSON.stringify({ error: 'not_linked' }) };
    if (!data.linked_at) return { statusCode: 425, body: JSON.stringify({ error: 'not_ready' }) };
    if (new Date(data.code_expires_at).getTime() < Date.now()) {
      return { statusCode: 410, body: JSON.stringify({ error: 'code_expired' }) };
    }

    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) return { statusCode: 500, body: JSON.stringify({ error: 'jwt_env_missing' }) };

    const token = signJWT({ deviceId, userId: data.user_id }, jwtSecret, TOKEN_TTL_MS);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    return { statusCode: 200, body: JSON.stringify({ token, expiresAt }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', details: err?.message }) };
  }
};


