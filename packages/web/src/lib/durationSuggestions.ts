/**
 * Duration Suggestion Utilities - Sprint 36
 *
 * Handles fetching duration suggestions from the API
 */

import type { DurationSuggestion } from '@/types';

// ============================================================
// API Fetching
// ============================================================

export interface FetchSuggestionParams {
  title: string;
  content: string[];
}

export async function fetchDurationSuggestion(
  params: FetchSuggestionParams
): Promise<DurationSuggestion | null> {
  try {
    const response = await fetch('/api/presentations/suggestions/duration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('[Duration Suggestion] API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.suggestion) {
      return data.suggestion;
    }

    return null;
  } catch (error) {
    console.error('[Duration Suggestion] Fetch error:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (required for suggestions)
 */
export function isUserAuthenticated(): boolean {
  // Simple check - in production this would check actual auth state
  // For now, check if we have a session cookie or token
  if (typeof window === 'undefined') return false;

  try {
    return document.cookie.includes('sb-') || // Supabase session
           (localStorage.getItem('deviceToken') !== null); // Device token
  } catch (error) {
    // localStorage might not be available in some contexts
    return document.cookie.includes('sb-');
  }
}
