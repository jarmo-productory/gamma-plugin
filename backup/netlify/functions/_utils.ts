import type { HandlerEvent } from '@netlify/functions';

export function json(statusCode: number, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
  };
}

export function getClientIp(event: HandlerEvent): string {
  const xfwd = (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '').toString();
  if (xfwd) return xfwd.split(',')[0].trim();
  const realIp = (event.headers['x-real-ip'] || event.headers['X-Real-Ip'] || '').toString();
  if (realIp) return realIp;
  return 'unknown';
}

type RateEntry = { count: number; resetAt: number };
const buckets: Record<string, Map<string, RateEntry>> = {};

export function rateLimit(
  bucketName: string,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
  if (!buckets[bucketName]) buckets[bucketName] = new Map<string, RateEntry>();
  const map = buckets[bucketName];

  const now = Date.now();
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  existing.count += 1;
  map.set(key, existing);

  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: Math.max(0, limit - existing.count) };
}

export function log(event: HandlerEvent, message: string, details?: Record<string, unknown>) {
  const ip = getClientIp(event);
  const payload = {
    ts: new Date().toISOString(),
    msg: message,
    ip,
    path: event.path,
    method: event.httpMethod,
    ...details,
  };
  console.log(JSON.stringify(payload));
}


