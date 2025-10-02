import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';
import {
  generatePresentationsListETag,
  handleConditionalRequest,
  addCacheHeaders,
  CACHE_CONFIG,
} from '@/utils/cache-helpers';
import { withCors, handleOPTIONS } from '@/utils/cors';

const shouldLogPerformance = process.env.LOG_PRESENTATIONS_PERF === 'true' || process.env.NODE_ENV !== 'production'

const logQueryDuration = (label: string, startedAt: number, count: number) => {
  if (!shouldLogPerformance) return

  const durationMs = Date.now() - startedAt
  const message = `[perf][presentations:list] label=${label} duration=${durationMs}ms count=${count}`

  if (durationMs > 100) {
    console.warn(`${message} (slow-query-warning)`)
  } else {
    console.log(message)
  }
}

export const runtime = 'nodejs'

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

export async function GET(request: NextRequest) {
  try {
    const startedAt = Date.now()
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

    if (authUser.source === 'device-token') {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('rpc_list_presentations', { p_user_id: dbUserId });
      if (error) {
        console.error('[Presentations List] RPC error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch presentations' }, { status: 500 }), request);
      }
      const presentations = data || [];
      const formattedPresentations = presentations.map((p: any) => ({
        id: p.id,
        title: p.title,
        presentationUrl: p.gamma_url,
        startTime: p.start_time,
        totalDuration: p.total_duration,
        slideCount: p.timetable_data?.items?.length || 0,
        timetableData: p.timetable_data,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      logQueryDuration('device-token-rpc', startedAt, formattedPresentations.length)
      const responseData = { success: true, presentations: formattedPresentations, count: formattedPresentations.length };

      // Generate ETag for caching
      const etag = generatePresentationsListETag(formattedPresentations);

      // Check for conditional request
      const conditionalResponse = handleConditionalRequest(request, etag);
      if (conditionalResponse) {
        return withCors(conditionalResponse, request);
      }

      // Create response with cache headers
      const response = NextResponse.json(responseData);
      return withCors(addCacheHeaders(response, etag, {
        ...CACHE_CONFIG.presentations.list,
        private: true, // User-specific data should be private
      }), request);
    }

    const supabase = await createAuthenticatedSupabaseClient(authUser);
    const { data: presentations, error } = await supabase
      .from('presentations')
      .select('id,title,gamma_url,start_time,total_duration,timetable_data,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Presentations List] Database error:', error);
      return withCors(NextResponse.json(
        { error: 'Failed to fetch presentations' },
        { status: 500 }
      ), request);
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
    logQueryDuration('supabase-client', startedAt, formattedPresentations.length)

    const responseData = {
      success: true,
      presentations: formattedPresentations,
      count: formattedPresentations.length
    };

    // Generate ETag for caching
    const etag = generatePresentationsListETag(formattedPresentations);

    // Check for conditional request
    const conditionalResponse = handleConditionalRequest(request, etag);
    if (conditionalResponse) {
      return withCors(conditionalResponse, request);
    }

    // Create response with cache headers
    const response = NextResponse.json(responseData);
    return withCors(addCacheHeaders(response, etag, {
      ...CACHE_CONFIG.presentations.list,
      private: true, // User-specific data should be private
    }), request);
  } catch (error) {
    console.error('[Presentations List] Unexpected error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to fetch presentations' },
      { status: 500 }
    ), request);
  }
}
