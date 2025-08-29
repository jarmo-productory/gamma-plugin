import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch user's presentations with RLS automatically enforced
    const { data: presentations, error } = await supabase
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