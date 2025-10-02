import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/auth-helpers';
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

    // Parse request body
    const body: DurationSuggestionRequest = await request.json();
    const { title, content } = body;

    if (!title || !content || !Array.isArray(content)) {
      return withCors(NextResponse.json(
        { success: false, error: 'Invalid request: title and content array required' },
        { status: 400 }
      ), request);
    }

    // Serialize content to text (canonical format)
    const contentText = content.join(' ');

    // Create Supabase client
    const supabase = await createClient();

    // Query for similar slides using pg_trgm similarity
    // Thresholds: 95% title similarity + 90% content similarity
    const { data: matches, error } = await supabase.rpc('get_duration_suggestion', {
      p_title: title,
      p_content: contentText,
      p_title_threshold: 0.95,
      p_content_threshold: 0.90
    });

    if (error) {
      console.error('[Duration Suggestion] RPC error:', error);
      return withCors(NextResponse.json(
        { success: false, error: 'Failed to fetch duration suggestion' },
        { status: 500 }
      ), request);
    }

    // No matches found
    if (!matches || matches.length === 0) {
      return withCors(NextResponse.json({
        success: true,
        message: 'No similar slides found'
      }), request);
    }

    // Parse result from RPC
    const result = matches[0];

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
