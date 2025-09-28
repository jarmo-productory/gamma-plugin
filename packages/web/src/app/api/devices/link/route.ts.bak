import { NextRequest, NextResponse } from 'next/server';
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
    const { code } = body;

    if (!code) {
      return withCors(NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      ));
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return withCors(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    // Fetch registration from DB
    const { data: reg, error: selErr } = await supabase
      .from('device_registrations')
      .select('device_id, expires_at, linked')
      .eq('code', code)
      .maybeSingle();

    if (selErr || !reg) {
      return withCors(NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 }));
    }

    if (new Date() > new Date(reg.expires_at)) {
      return withCors(NextResponse.json({ error: 'Code expired' }, { status: 404 }));
    }

    // Link the device to the user in DB
    const { error: updErr } = await supabase
      .from('device_registrations')
      .update({ linked: true, user_id: user.id, user_email: user.email, linked_at: new Date().toISOString() })
      .eq('code', code);

    if (updErr) {
      console.error('[Device Link] Update failed:', updErr);
      return withCors(NextResponse.json({ error: 'Failed to link device' }, { status: 500 }));
    }

    console.log(`[Device Link] Linked device ${reg.device_id} to user ${user.email} (DB-backed)`);

    return withCors(NextResponse.json({
      success: true,
      deviceId: reg.device_id,
      message: 'Device linked successfully'
    }));
  } catch (error) {
    console.error('[Device Link] Error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to link device' },
      { status: 500 }
    ));
  }
}
