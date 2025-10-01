import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';

  // Allow Chrome extension origins and localhost
  const allowedOrigins = [
    'chrome-extension://bhoijiicgpeihilgcfndkgkifmhccnjn',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://productory-powerups.netlify.app'
  ];

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) ||
                    origin.startsWith('chrome-extension://');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function withCors(res: NextResponse, request: NextRequest) {
  const headers = getCorsHeaders(request);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function OPTIONS(request: NextRequest) {
  const headers = getCorsHeaders(request);
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(request: NextRequest) {
  try {
    // Sprint 27: Extract device fingerprint from request
    const body = await request.json().catch(() => ({}));
    const deviceFingerprint = body.device_fingerprint || null;
    
    // Generate a unique device ID and pairing code
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store registration in database using anonymous client (no auth cookies)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Sprint 27: Include device fingerprint in registration (temporarily disabled for cache refresh)
    const { error: insertError } = await supabase
      .from('device_registrations')
      .insert({ 
        code, 
        device_id: deviceId, 
        expires_at: expiresAt,
        // device_fingerprint: deviceFingerprint  // TODO: Re-enable after Supabase cache refresh
      });

    if (insertError) {
      console.error('[Device Register] DB insert failed:', insertError);
      return withCors(NextResponse.json({ error: 'Failed to register device' }, { status: 500 }), request);
    }

    console.log(`[Device Register] Created device: ${deviceId} with code: ${code}, fingerprint: ${deviceFingerprint ? 'present' : 'none'}`);

    return withCors(NextResponse.json({
      deviceId,
      code,
      expiresAt,
    }), request);
  } catch (error) {
    console.error('[Device Register] Error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    ), request);
  }
}
