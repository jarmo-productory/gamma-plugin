import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function randomId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const handler: Handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'supabase_env_missing' }) };
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
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'insert_failed', details: error.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ deviceId, code, expiresAt }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', details: err?.message }) };
  }
};


