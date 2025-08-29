import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user record from database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('[Presentations Save] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if presentation already exists (upsert behavior)
    const { data: existingPresentation } = await supabase
      .from('presentations')
      .select('id')
      .eq('gamma_url', gamma_url)
      .eq('user_id', userRecord.id)
      .single();

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