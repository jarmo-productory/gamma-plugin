import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken, generateDeviceInfo } from '@/utils/secureTokenStore';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function withCors(res: NextResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, code } = body;

    if (!deviceId || !code) {
      return withCors(NextResponse.json(
        { error: 'deviceId and code are required' },
        { status: 400 }
      ));
    }

    // SPRINT 19 SECURITY: Generate cryptographically secure opaque token
    const token = generateSecureToken(); // 256-bit entropy, no embedded info
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate secure device info
    const { deviceName } = generateDeviceInfo(request.headers.get('user-agent') || undefined);

    // Store token via SECURITY DEFINER RPC without service role
    const supabase = await createClient();
    const { data: rpcOk, error: rpcErr } = await supabase.rpc('exchange_device_code', {
      input_code: code,
      input_device_id: deviceId,
      input_device_name: deviceName || `Chrome Extension (${deviceId.slice(0, 8)}...)`,
      raw_token: token,
      p_expires_at: tokenExpiresAt.toISOString(),
    });

    if (rpcErr) {
      console.error('[Device Exchange] RPC error:', rpcErr.message);
      return withCors(NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 }));
    }

    if (rpcOk !== true) {
      // RPC returned false - device not linked/ready yet, this is expected during polling
      console.log('[Device Exchange] Device not linked yet, polling will continue');
      return withCors(NextResponse.json({ error: 'Device not linked yet' }, { status: 404 }));
    }

    console.log(`[Device Exchange] SECURE: Generated secure token for device: ${deviceId}`);

    return withCors(NextResponse.json({
      token, // Return raw token to client (only stored as hash in database)
      expiresAt: tokenExpiresAt.toISOString(),
    }));
  } catch (error) {
    console.error('[Device Exchange] Error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    ));
  }
}
