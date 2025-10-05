import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';
import { ensureUserRecord } from '@/utils/user';
import { canonicalizeGammaUrl } from '@/utils/url';
import { normalizeSaveRequest } from '@/schemas/presentations';
import { ZodError } from 'zod';
import { withCors, handleOPTIONS } from '@/utils/cors';

export const runtime = 'nodejs'

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { deprecatedCamelUsed, ...payload } = normalizeSaveRequest(rawBody);
    if (deprecatedCamelUsed) {
      console.warn('DEPRECATED_CAMEL_PAYLOAD: presentations.save will drop camelCase on 2025-10-01');
    }

    // Canonicalize URL
    const canonicalUrl = canonicalizeGammaUrl(payload.gamma_url);

    // Authenticate user (device token or Supabase session)
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ), request);
    }

    // RLS COMPLIANCE: Device-token path requires RPC-based ops; block direct table access
    if (authUser.source === 'device-token') {
      // Device-token path uses SECURITY DEFINER RPC via anon client (RLS compliant)
      const supabase = await createClient();

      // CRITICAL: Parameter order must match RPC function signature exactly
      // RPC signature: (p_auth_id, p_gamma_url, p_title, p_timetable_data, p_start_time, p_total_duration, p_email)
      const { data, error } = await supabase.rpc('rpc_upsert_presentation_from_device', {
        p_auth_id: authUser.userId,
        p_gamma_url: canonicalUrl,
        p_title: payload.title,
        p_timetable_data: payload.timetable_data,
        p_start_time: payload.start_time ?? null,
        p_total_duration: payload.total_duration ?? null,
        p_email: authUser.userEmail || null,
      });

      if (error) {
        console.error('presentations_save_rpc_fail', { error, code: error?.code, details: error?.details, hint: error?.hint });
        const status = error?.code === 'P0001' ? 404 : 500;
        return withCors(NextResponse.json({
          error: 'Failed to save presentation',
          debug: {
            code: error?.code,
            message: error?.message,
            details: error?.details,
            hint: error?.hint
          }
        }, { status }), request);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        console.error('presentations_save_rpc_empty_response');
        return withCors(NextResponse.json({ error: 'Failed to save presentation' }, { status: 500 }), request);
      }

      console.log('presentations_save_rpc_success');
      const formattedPresentation = {
        id: row.id,
        title: row.title,
        presentationUrl: row.gamma_url,
        startTime: row.start_time,
        totalDuration: row.total_duration,
        slideCount: row.timetable_data?.items?.length || 0,
        timetableData: row.timetable_data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      return withCors(NextResponse.json({ success: true, presentation: formattedPresentation, message: 'Presentation saved' }), request);
    }

    // Web session path: use SSR client and ensure first-party users row
    const supabase = await createClient();
    const appUser = await ensureUserRecord(supabase, { id: authUser.userId, email: authUser.userEmail });
    const userRecord = { id: appUser.id };

    // Check if presentation already exists (upsert behavior)
    const existingQuery = supabase
      .from('presentations')
      .select('id')
      .eq('gamma_url', canonicalUrl)
      .eq('user_id', userRecord.id);

    const { data: existingPresentation } = await existingQuery.single();

    let result;
    if (existingPresentation) {
      // Update existing presentation - let database handle updated_at timestamp
      const { data, error } = await supabase
        .from('presentations')
        .update({
          title: payload.title,
          start_time: payload.start_time || '09:00',
          total_duration: payload.total_duration || 0,
          timetable_data: payload.timetable_data
          // Remove manual updated_at - let database trigger handle it
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
          title: payload.title,
          gamma_url: canonicalUrl,
          start_time: payload.start_time || '09:00',
          total_duration: payload.total_duration || 0,
          timetable_data: payload.timetable_data
        })
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('[Presentations Save] Database error:', result.error);
      return withCors(NextResponse.json(
        { error: 'Failed to save presentation' },
        { status: 500 }
      ), request);
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

    return withCors(NextResponse.json({
      success: true,
      presentation: formattedPresentation,
      message: existingPresentation ? 'Presentation updated successfully' : 'Presentation created successfully'
    }), request);
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('presentations_validation_error', error.issues);
      return withCors(NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid body', details: error.issues }, { status: 400 }), request);
    }
    console.error('[Presentations Save] Unexpected error:', error);
    return withCors(NextResponse.json({
      error: 'Failed to save presentation',
      debug: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name
      }
    }, { status: 500 }), request);
  }
}
// Cache bust: Fri Oct  3 15:15:00 EEST 2025 - UUID validation + device-token error handling
