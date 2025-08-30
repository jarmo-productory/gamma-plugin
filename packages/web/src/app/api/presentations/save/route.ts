import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      gamma_url, 
      start_time, 
      total_duration, 
      timetable_data 
    } = body;

    // Validate required fields
    if (!title || !gamma_url || !timetable_data) {
      return NextResponse.json(
        { error: 'Title, gamma_url, and timetable_data are required' },
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
    console.log('[DEBUG] authUser:', authUser);
    console.log('[DEBUG] dbUserId:', dbUserId);
    
    if (!dbUserId) {
      return NextResponse.json(
        { error: `User not found in database. AuthUser: ${JSON.stringify(authUser)}, dbUserId: ${dbUserId}` },
        { status: 404 }
      );
    }

    const supabase = await createAuthenticatedSupabaseClient(authUser);

    // We already have the correct database user ID from getDatabaseUserId
    const userRecord = { id: dbUserId };

    // Check if presentation already exists (upsert behavior)
    let existingQuery = supabase
      .from('presentations')
      .select('id')
      .eq('gamma_url', gamma_url)
      .eq('user_id', userRecord.id);

    const { data: existingPresentation } = await existingQuery.single();

    let result;
    if (existingPresentation) {
      // Update existing presentation
      const { data, error } = await supabase
        .from('presentations')
        .update({
          title,
          start_time: start_time || '09:00',
          total_duration: total_duration || 0,
          timetable_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPresentation.id)
        .select()
        .single();

      result = { data, error };
    } else {
      // Insert new presentation
      const { data, error } = await supabase
        .from('presentations')
        .insert({
          user_id: userRecord.id,
          title,
          gamma_url,
          start_time: start_time || '09:00',
          total_duration: total_duration || 0,
          timetable_data
        })
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('[Presentations Save] Database error:', result.error);
      return NextResponse.json(
        { error: 'Failed to save presentation' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const presentation = result.data;
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
      presentation: formattedPresentation,
      message: existingPresentation ? 'Presentation updated successfully' : 'Presentation created successfully'
    });
  } catch (error) {
    console.error('[Presentations Save] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to save presentation' },
      { status: 500 }
    );
  }
}