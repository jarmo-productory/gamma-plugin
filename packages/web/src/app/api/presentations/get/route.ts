import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';
import { canonicalizeGammaUrl } from '@/utils/url';
import { withCors, handleOPTIONS } from '@/utils/cors';

export const runtime = 'nodejs'

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

export async function GET(request: NextRequest) {
  try {
    // Parse URL parameter
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return withCors(NextResponse.json(
        { error: 'url parameter is required' },
        { status: 400 }
      ), request);
    }

    // Authenticate user (device token or Supabase session)
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ), request);
    }

    // Get database user ID for RLS
    const dbUserId = await getDatabaseUserId(authUser);
    if (!dbUserId) {
      return withCors(NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      ), request);
    }

    const canonicalUrl = canonicalizeGammaUrl(url);

    if (authUser.source === 'device-token') {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('rpc_get_presentation_by_url', {
        p_user_id: dbUserId,
        p_gamma_url: canonicalUrl,
      });
      if (error) {
        console.error('[Presentations Get] RPC error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch presentation' }, { status: 500 }), request);
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return withCors(NextResponse.json({ error: 'Presentation not found' }, { status: 404 }), request);
      }
      return withCors(NextResponse.json({
        success: true,
        timetableData: row.timetable_data,
        updatedAt: row.updated_at
      }), request);
    }

    // Web session path: RLS via SSR client
    const supabase = await createAuthenticatedSupabaseClient(authUser);
    const { data: presentation, error } = await supabase
      .from('presentations')
      .select('timetable_data,updated_at')
      .eq('gamma_url', canonicalUrl)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return withCors(NextResponse.json(
          { error: 'Presentation not found' },
          { status: 404 }
        ), request);
      }
      console.error('[Presentations Get] Database error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to fetch presentation' },
        { status: 500 }
      ), request);
    }

    // Return in format expected by extension
    return withCors(NextResponse.json({
      success: true,
      timetableData: presentation.timetable_data,
      updatedAt: presentation.updated_at
    }), request);
  } catch (error) {
    console.error('[Presentations Get] Unexpected error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to fetch presentation' },
      { status: 500 }
    ), request);
  }
}
