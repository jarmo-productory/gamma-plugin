import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { code } = JSON.parse(event.body || '{}');
    if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'missing_code' }) };

    // In production we would verify Clerk session here and get user id
    const userId = event.headers['x-dev-user-id'] || 'dev-user';

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

    if (error || !data) return { statusCode: 404, body: JSON.stringify({ error: 'code_not_found' }) };
    if (new Date(data.code_expires_at).getTime() < Date.now()) {
      return { statusCode: 410, body: JSON.stringify({ error: 'code_expired' }) };
    }

    const { error: upErr } = await supabase
      .from('devices')
      .update({ user_id: userId, linked_at: new Date().toISOString() })
      .eq('device_id', data.device_id);

    if (upErr) return { statusCode: 500, body: JSON.stringify({ error: 'link_failed', details: upErr.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', details: err?.message }) };
  }
};


