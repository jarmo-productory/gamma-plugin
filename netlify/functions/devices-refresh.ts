import type { Handler } from '@netlify/functions';
import crypto from 'crypto';

function signHS256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function verifyJWT(token: string, secret: string): { ok: boolean; payload?: any } {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return { ok: false };
    const expected = signHS256(`${h}.${p}`, secret);
    if (expected !== s) return { ok: false };
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp * 1000 < Date.now()) return { ok: false };
    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
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
    const auth = event.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!bearer) return { statusCode: 401, body: JSON.stringify({ error: 'missing_token' }) };
    const secret = process.env.JWT_SECRET as string;
    const v = verifyJWT(bearer, secret);
    if (!v.ok) return { statusCode: 401, body: JSON.stringify({ error: 'invalid_token' }) };
    const { deviceId, userId } = v.payload;
    const token = signJWT({ deviceId, userId }, secret, TOKEN_TTL_MS);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    return { statusCode: 200, body: JSON.stringify({ token, expiresAt }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', details: err?.message }) };
  }
};


