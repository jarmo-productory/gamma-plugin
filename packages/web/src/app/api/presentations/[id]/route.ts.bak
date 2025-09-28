import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user (device token or Supabase session)
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get database user ID for RLS
    const dbUserId = await getDatabaseUserId(authUser);
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const { id } = await params;
    if (authUser.source === 'device-token') {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('rpc_get_presentation_by_id', {
        p_user_id: dbUserId,
        p_id: id,
      });
      if (error) {
        console.error('[Presentations Get] RPC error:', error);
        return NextResponse.json({ error: 'Failed to fetch presentation' }, { status: 500 });
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
      }
      const formattedPresentation = {
        id: row.id,
        title: row.title,
        presentationUrl: row.gamma_url,
        startTime: row.start_time,
        totalDuration: row.total_duration,
        slideCount: row.timetable_data?.items?.length || 0,
        timetableData: row.timetable_data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      return NextResponse.json({ success: true, presentation: formattedPresentation });
    }

    const supabase = await createAuthenticatedSupabaseClient(authUser);
    const { data: presentation, error } = await supabase
      .from('presentations')
      .select('id,title,gamma_url,start_time,total_duration,timetable_data,created_at,updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Presentation not found' },
          { status: 404 }
        );
      }
      console.error('[Presentations Get] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch presentation' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const formattedPresentation = {
      id: presentation.id,
      title: presentation.title,
      presentationUrl: presentation.gamma_url,
      startTime: presentation.start_time,
      totalDuration: presentation.total_duration,
      slideCount: presentation.timetable_data?.items?.length || 0,
      timetableData: presentation.timetable_data,
      createdAt: presentation.created_at,
      updatedAt: presentation.updated_at
    };

    return NextResponse.json({
      success: true,
      presentation: formattedPresentation
    });
  } catch (error) {
    console.error('[Presentations Get] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presentation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user (device token or Supabase session)
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get database user ID for RLS
    const dbUserId = await getDatabaseUserId(authUser);
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const { id } = await params;

    if (authUser.source === 'device-token') {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('rpc_delete_presentation', {
        p_user_id: dbUserId,
        p_id: id,
      });
      if (error) {
        console.error('[Presentations Delete] RPC error:', error);
        return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
      }
      const success = data === true;
      if (!success) {
        return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Presentation deleted successfully' });
    }

    // Supabase session path (RLS enforced)
    const supabase = await createAuthenticatedSupabaseClient(authUser);
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Presentations Delete] Database error:', error);
      return NextResponse.json({ error: 'Failed to delete presentation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Presentation deleted successfully' });
  } catch (error) {
    console.error('[Presentations Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete presentation' },
      { status: 500 }
    );
  }
}
