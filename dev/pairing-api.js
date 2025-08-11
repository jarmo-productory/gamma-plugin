/* eslint-disable @typescript-eslint/no-require-imports */
// Minimal local dev API + page for device pairing (in-memory)
// Endpoints:
//  - GET  /sign-in?code=XYZ -> simple page to "Log in" and link code
//  - POST /api/devices/register -> { deviceId, code, expiresAt }
//  - POST /api/devices/link     -> { code }  (marks code linked to a dev user)
//  - POST /api/devices/exchange -> { deviceId, code } -> { token, expiresAt } when linked

const http = require('http');
const { randomBytes, createHmac } = require('crypto');
const { Buffer } = require('buffer');

const PORT = 3000;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const JWT_SECRET = process.env.DEV_JWT_SECRET || 'dev-secret';

/** @type {Record<string, { deviceId: string; code: string; codeExpiresAt: number; linked: boolean; userId?: string }>} */
const codeStore = {};

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...headers,
  });
  res.end(payload);
}

function notFound(res) {
  json(res, 404, { error: 'Not found' });
}

function noContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end();
}

function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function newDeviceId() {
  return randomBytes(8).toString('hex');
}

function newCode() {
  // 6-char base36 code
  return randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

function now() {
  return Date.now();
}

// --- JWT helpers (HS256) ---
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJWT(payloadObj, secret, ttlMs) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(now() / 1000);
  const expSec = nowSec + Math.floor((ttlMs || TOKEN_TTL_MS) / 1000);
  const payload = { ...payloadObj, iat: nowSec, exp: expSec };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const toSign = `${headerB64}.${payloadB64}`;
  const sig = signHS256(toSign, secret);
  return `${toSign}.${sig}`;
}

function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return { ok: false, error: 'malformed' };
    const expected = signHS256(`${h}.${p}`, secret);
    if (expected !== s) return { ok: false, error: 'bad_signature' };
    const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    if (!payload.exp || typeof payload.exp !== 'number') return { ok: false, error: 'no_exp' };
    if (payload.exp * 1000 < now()) return { ok: false, error: 'expired' };
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'invalid_token' };
  }
}

const server = http.createServer(async (req, res) => {
  const { url, method } = req;
  if (!url) return notFound(res);

  // CORS preflight
  if (method === 'OPTIONS') {
    return noContent(res);
  }

  // Simple sign-in page (dev only)
  if (method === 'GET' && (url.startsWith('/sign-in') || url === '/')) {
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Sign in</title>
      <style>body{font-family:system-ui;margin:40px;max-width:640px}button{padding:8px 12px}</style>
    </head>
    <body>
      <h1>Sign in (Dev)</h1>
      <p>This is a development stub that simulates Clerk login. Click the button to link your device code.</p>
      <p id="code"></p>
      <button id="loginBtn">Log in</button>
      <p id="status" style="margin-top:12px;color:#0a0"></p>
      <script>
        function getParam(name){const u=new URL(window.location.href);return u.searchParams.get(name)||''}
        const code = getParam('code') || '(no code)';
        document.getElementById('code').textContent = 'Code: ' + code;
        document.getElementById('loginBtn').onclick = async () => {
          const res = await fetch('/api/devices/link', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code })});
          if(res.ok){
            document.getElementById('status').textContent = 'You are now logged in and can close this page.';
          } else {
            const b = await res.json().catch(()=>({}));
            document.getElementById('status').style.color = '#a00';
            document.getElementById('status').textContent = 'Link failed: ' + (b.error||res.status);
          }
        }
      </script>
    </body>
    </html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Protected ping (dev): verify token
  if (method === 'GET' && url === '/api/protected/ping') {
    const auth = req.headers['authorization'] || '';
    const parts = Array.isArray(auth) ? auth[0] : auth;
    const token = parts.startsWith('Bearer ') ? parts.slice(7) : '';
    if (!token) return json(res, 401, { error: 'missing_token' });
    const v = verifyJWT(token, JWT_SECRET);
    if (!v.ok) return json(res, 401, { error: v.error });
    return json(res, 200, { ok: true, deviceId: v.payload.deviceId, userId: v.payload.userId });
  }

  if (method !== 'POST') return notFound(res);

  if (url === '/api/devices/register') {
    const deviceId = newDeviceId();
    const code = newCode();
    const codeExpiresAt = now() + CODE_TTL_MS;
    codeStore[code] = { deviceId, code, codeExpiresAt, linked: false };
    return json(res, 200, {
      deviceId,
      code,
      expiresAt: new Date(codeExpiresAt).toISOString(),
    });
  }

  if (url === '/api/devices/link') {
    const body = await parseBody(req);
    const { code } = body || {};
    const rec = codeStore[code];
    if (!rec) return json(res, 404, { error: 'code_not_found' });
    if (rec.codeExpiresAt < now()) return json(res, 410, { error: 'code_expired' });
    rec.linked = true;
    rec.userId = 'dev-user';
    return json(res, 200, { ok: true });
  }

  if (url === '/api/devices/exchange') {
    const body = await parseBody(req);
    const { deviceId, code } = body || {};
    const rec = codeStore[code];
    if (!rec || rec.deviceId !== deviceId) return json(res, 404, { error: 'not_linked' });
    if (rec.codeExpiresAt < now()) return json(res, 410, { error: 'code_expired' });
    if (!rec.linked || !rec.userId) return json(res, 425, { error: 'not_ready' });
    const expiresAt = now() + TOKEN_TTL_MS;
    const token = signJWT({ deviceId, userId: rec.userId }, JWT_SECRET, TOKEN_TTL_MS);
    return json(res, 200, { token, expiresAt: new Date(expiresAt).toISOString() });
  }

  if (url === '/api/devices/refresh') {
    const auth = req.headers['authorization'] || '';
    const parts = Array.isArray(auth) ? auth[0] : auth;
    const token = parts.startsWith('Bearer ') ? parts.slice(7) : '';
    if (!token) return json(res, 401, { error: 'missing_token' });
    const v = verifyJWT(token, JWT_SECRET);
    if (!v.ok) return json(res, 401, { error: v.error });
    const { deviceId, userId } = v.payload || {};
    if (!deviceId || !userId) return json(res, 400, { error: 'invalid_claims' });
    const expiresAt = now() + TOKEN_TTL_MS;
    const newToken = signJWT({ deviceId, userId }, JWT_SECRET, TOKEN_TTL_MS);
    return json(res, 200, { token: newToken, expiresAt: new Date(expiresAt).toISOString() });
  }

  return notFound(res);
});

server.listen(PORT, () => {
  console.log(`[pairing-api] listening on http://localhost:${PORT}`);
});


