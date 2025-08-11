import type { Handler } from '@netlify/functions';
import crypto from 'crypto';

function signHS256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export const handler: Handler = async (event) => {
  const secret = process.env.JWT_SECRET as string;
  const auth = event.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'missing_token' }) };
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return { statusCode: 401, body: JSON.stringify({ error: 'malformed' }) };
    const expected = signHS256(`${h}.${p}`, secret);
    if (expected !== s) return { statusCode: 401, body: JSON.stringify({ error: 'bad_signature' }) };
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp * 1000 < Date.now()) return { statusCode: 401, body: JSON.stringify({ error: 'expired' }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, deviceId: payload.deviceId, userId: payload.userId }) };
  } catch (e: any) {
    return { statusCode: 401, body: JSON.stringify({ error: 'invalid_token', details: e?.message }) };
  }
};


