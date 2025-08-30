import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const supabase = await createAuthenticatedSupabaseClient(authUser);

    // Fetch specific presentation with proper user filtering
    let query = supabase
      .from('presentations')
      .select(`
        id,
        title,
        gamma_url,
        start_time,
        total_duration,
        timetable_data,
        created_at,
        updated_at
      `)
      .eq('id', id);

    // Add user constraint for device token auth (RLS won't work automatically)
    if (authUser.source === 'device-token') {
      query = query.eq('user_id', dbUserId);
    }

    const { data: presentation, error } = await query.single();

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
  { params }: { params: { id: string } }
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

    const { id } = params;
    const supabase = await createAuthenticatedSupabaseClient(authUser);

    // Delete presentation with proper user filtering
    let deleteQuery = supabase
      .from('presentations')
      .delete()
      .eq('id', id);

    // Add user constraint for device token auth (RLS won't work automatically)
    if (authUser.source === 'device-token') {
      deleteQuery = deleteQuery.eq('user_id', dbUserId);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('[Presentations Delete] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete presentation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Presentation deleted successfully'
    });
  } catch (error) {
    console.error('[Presentations Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete presentation' },
      { status: 500 }
    );
  }
}