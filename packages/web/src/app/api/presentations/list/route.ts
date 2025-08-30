import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';

export async function GET(request: NextRequest) {
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

    const supabase = await createAuthenticatedSupabaseClient(authUser);

    // Fetch user's presentations with proper user filtering
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
      .order('updated_at', { ascending: false });

    // Add user constraint for device token auth (RLS won't work automatically)
    if (authUser.source === 'device-token') {
      query = query.eq('user_id', dbUserId);
    }

    const { data: presentations, error } = await query;

    if (error) {
      console.error('[Presentations List] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch presentations' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const formattedPresentations = presentations.map(p => ({
      id: p.id,
      title: p.title,
      presentationUrl: p.gamma_url,
      startTime: p.start_time,
      totalDuration: p.total_duration,
      slideCount: p.timetable_data?.items?.length || 0,
      timetableData: p.timetable_data,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return NextResponse.json({
      success: true,
      presentations: formattedPresentations,
      count: formattedPresentations.length
    });
  } catch (error) {
    console.error('[Presentations List] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presentations' },
      { status: 500 }
    );
  }
}