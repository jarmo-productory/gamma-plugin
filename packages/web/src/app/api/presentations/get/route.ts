import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Parse URL parameter
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'url parameter is required' },
        { status: 400 }
      );
    }

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

    // Query presentation by URL with user constraint
    const supabase = await createAuthenticatedSupabaseClient(authUser);
    
    // For device token auth, we need to manually filter by user_id since RLS won't work
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
      .eq('gamma_url', url);

    // Add user constraint for device token auth
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

    // Return in format expected by extension
    return NextResponse.json({
      success: true,
      timetableData: presentation.timetable_data
    });
  } catch (error) {
    console.error('[Presentations Get] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presentation' },
      { status: 500 }
    );
  }
}