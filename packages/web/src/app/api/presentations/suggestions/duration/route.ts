import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';
import type { DurationSuggestion, DurationSuggestionRequest } from '@/types';
import { withCors, handleOPTIONS } from '@/utils/cors';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

/**
 * POST /api/presentations/suggestions/duration
 *
 * Get duration suggestion for a slide based on historical data from similar slides
 * using PostgreSQL trigram similarity matching.
 *
 * Request body:
 * {
 *   title: string;        // Slide title
 *   content: string[];    // Slide content lines
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   suggestion?: DurationSuggestion;
 *   message?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ), request);
    }

    // CRITICAL: Get database user ID (users.id) not auth ID (users.auth_id)
    // slide_fingerprints.user_id references users.id, NOT auth.uid()
    const dbUserId = await getDatabaseUserId(authUser);
    if (!dbUserId) {
      return withCors(NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      ), request);
    }

    // Parse request body with better error handling
    let body: DurationSuggestionRequest;
    try {
      body = await request.json();
      console.log(`[Duration API] Received request - title: "${body?.title?.substring(0, 30)}...", content length: ${body?.content?.length}`);
    } catch (jsonError) {
      console.error('[Duration Suggestion] JSON parse error:', jsonError);
      return withCors(NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      ), request);
    }

    const { title, content } = body;

    if (!title || !content || !Array.isArray(content)) {
      return withCors(NextResponse.json(
        { success: false, error: 'Invalid request: title and content array required' },
        { status: 400 }
      ), request);
    }

    // Serialize content to text (canonical format)
    // Handle both string arrays and object arrays (content items with type/value)
    const contentText = content.map((item: any) => {
      if (typeof item === 'string') {
        return item;
      } else if (item && typeof item === 'object' && item.value) {
        return item.value;
      } else if (item && typeof item === 'object' && item.text) {
        return item.text;
      }
      return String(item);
    }).join(' ');

    // DEBUGGING: Log what we're sending to RPC
    console.log(`[Duration API] DEBUG - About to call RPC with:`);
    console.log(`  - auth_id: ${authUser.userId} (Supabase auth)`);
    console.log(`  - database user_id: ${dbUserId} (users.id - CORRECT!)`);
    console.log(`  - title: "${title}"`);
    console.log(`  - content length: ${contentText.length} chars`);
    console.log(`  - content preview: "${contentText.substring(0, 100)}..."`);

    // Create Supabase client
    const supabase = await createClient();

    // Query for similar slides using pg_trgm similarity
    // Thresholds: 60% title similarity + 40% content similarity (lowered for better matches)
    // CRITICAL: Must pass database user_id (users.id), NOT auth_id (users.auth_id)!
    // slide_fingerprints.user_id is FK to users.id, not to auth.uid()
    const { data: matches, error } = await supabase.rpc('get_duration_suggestion', {
      p_title: title,
      p_content: contentText,
      p_title_threshold: 0.60,
      p_content_threshold: 0.40,
      p_user_id: dbUserId  // ✅ FIXED: Use database user ID, not auth ID
    });

    if (error) {
      console.error('[Duration Suggestion] RPC error:', error);
      return withCors(NextResponse.json(
        { success: false, error: 'Failed to fetch duration suggestion' },
        { status: 500 }
      ), request);
    }

    // No matches found - RPC always returns a row, so check sample_size instead
    if (!matches || matches.length === 0) {
      return withCors(NextResponse.json({
        success: true,
        message: 'No similar slides found'
      }), request);
    }

    // Parse result from RPC
    const result = matches[0];

    // CRITICAL: RPC returns zeros when no matches found (due to COALESCE)
    // Check sample_size to determine if we actually found matches
    if (result.sample_size === 0) {
      return withCors(NextResponse.json({
        success: true,
        message: 'No similar slides found'
      }), request);
    }

    // Determine confidence level based on sample size and variance
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (result.sample_size >= 5 && result.coefficient_of_variation < 0.3) {
      confidence = 'high';
    } else if (result.sample_size >= 3 && result.coefficient_of_variation < 0.5) {
      confidence = 'medium';
    }

    const suggestion: DurationSuggestion = {
      averageDuration: Math.round(result.avg_duration),
      confidence,
      sampleSize: result.sample_size,
      durationRange: {
        p25: Math.round(result.p25),
        median: Math.round(result.median),
        p75: Math.round(result.p75)
      },
      matchQuality: {
        titleSimilarity: result.avg_title_similarity,
        contentSimilarity: result.avg_content_similarity
      }
    };

    // Log for debugging
    console.log(`[Duration API] "${title.substring(0, 30)}..." -> sample_size: ${result.sample_size}, avg: ${result.avg_duration}`);

    return withCors(NextResponse.json({
      success: true,
      suggestion
    }), request);

  } catch (error) {
    console.error('[Duration Suggestion] Unexpected error:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    ), request);
  }
}
