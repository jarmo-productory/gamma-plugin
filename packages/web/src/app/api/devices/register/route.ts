import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
    // Generate a unique device ID and pairing code
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store registration in database using anonymous client (no auth cookies)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: insertError } = await supabase
      .from('device_registrations')
      .insert({ code, device_id: deviceId, expires_at: expiresAt });

    if (insertError) {
      console.error('[Device Register] DB insert failed:', insertError);
      return withCors(NextResponse.json({ error: 'Failed to register device' }, { status: 500 }));
    }

    console.log(`[Device Register] Created device: ${deviceId} with code: ${code} (DB-backed)`);

    return withCors(NextResponse.json({
      deviceId,
      code,
      expiresAt,
    }));
  } catch (error) {
    console.error('[Device Register] Error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    ));
  }
}
