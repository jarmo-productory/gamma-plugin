/**
 * Duration Suggestion Utilities - Sprint 36
 *
 * Handles fetching and managing duration suggestions from the API
 * Includes localStorage state management for user interactions
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

// ============================================================
// LocalStorage State Management
// ============================================================

export interface SlideState {
  userEdited: boolean;
  suggestionDismissed: boolean;
  lastSuggestion?: {
    duration: number;
    confidence: string;
    timestamp: number;
    accepted: boolean;
  };
}

const STORAGE_PREFIX = 'gamma_slide_state_';
const STORAGE_VERSION = 'v1';

/**
 * Get storage key for a specific presentation and slide
 */
function getStorageKey(presentationId: string, slideId: string): string {
  return `${STORAGE_PREFIX}${STORAGE_VERSION}_${presentationId}_${slideId}`;
}

/**
 * Load slide state from localStorage
 */
export function loadSlideState(
  presentationId: string,
  slideId: string
): SlideState {
  try {
    const key = getStorageKey(presentationId, slideId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return {
        userEdited: false,
        suggestionDismissed: false,
      };
    }

    const parsed = JSON.parse(stored);
    return {
      userEdited: parsed.userEdited ?? false,
      suggestionDismissed: parsed.suggestionDismissed ?? false,
      lastSuggestion: parsed.lastSuggestion,
    };
  } catch (error) {
    console.error('[Duration Suggestion] Error loading state:', error);
    return {
      userEdited: false,
      suggestionDismissed: false,
    };
  }
}

/**
 * Save slide state to localStorage
 */
export function saveSlideState(
  presentationId: string,
  slideId: string,
  state: Partial<SlideState>
): void {
  try {
    const key = getStorageKey(presentationId, slideId);
    const current = loadSlideState(presentationId, slideId);
    const updated = { ...current, ...state };

    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('[Duration Suggestion] Error saving state:', error);
  }
}

/**
 * Mark slide as manually edited (hides suggestions permanently)
 */
export function markSlideAsEdited(
  presentationId: string,
  slideId: string
): void {
  saveSlideState(presentationId, slideId, {
    userEdited: true,
    suggestionDismissed: false,
  });
}

/**
 * Mark suggestion as dismissed for this slide (hides current suggestion)
 */
export function dismissSuggestion(
  presentationId: string,
  slideId: string
): void {
  saveSlideState(presentationId, slideId, {
    suggestionDismissed: true,
  });
}

/**
 * Record that user accepted a suggestion
 */
export function acceptSuggestion(
  presentationId: string,
  slideId: string,
  suggestion: DurationSuggestion
): void {
  saveSlideState(presentationId, slideId, {
    userEdited: true, // Accepting counts as editing
    lastSuggestion: {
      duration: suggestion.averageDuration,
      confidence: suggestion.confidence,
      timestamp: Date.now(),
      accepted: true,
    },
  });
}

/**
 * Clear all stored state for a presentation (e.g., when presentation is deleted)
 */
export function clearPresentationState(presentationId: string): void {
  try {
    const keys = Object.keys(localStorage);
    const prefix = `${STORAGE_PREFIX}${STORAGE_VERSION}_${presentationId}_`;

    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[Duration Suggestion] Error clearing state:', error);
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
