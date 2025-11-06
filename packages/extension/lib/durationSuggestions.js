// durationSuggestions.js - Fetch duration suggestions from API
import { deviceAuth } from '@shared/auth/device';
import { configManager } from '../shared-config/index.js';

/**
 * Fetch duration suggestion for a slide based on historical data
 * @param {Object} params
 * @param {string} params.title - Slide title
 * @param {Array} params.content - Slide content items
 * @returns {Promise<Object|null>} - Duration suggestion object or null
 */
export async function fetchDurationSuggestion({ title, content }) {
  try {
    const config = configManager.getConfig();
    const apiBaseUrl = config.environment.apiBaseUrl;

    if (!apiBaseUrl) {
      console.warn('[Duration Suggestion] API base URL not configured');
      return null;
    }

    // Get authentication token
    const token = await deviceAuth.getStoredToken();
    if (!token) {
      console.warn('[Duration Suggestion] No authentication token available');
      return null;
    }

    // Prepare request body
    const body = {
      title,
      content: Array.isArray(content) ? content : []
    };

    // Call API endpoint
    const response = await fetch(`${apiBaseUrl}/api/presentations/suggestions/duration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(`[Duration Suggestion] API returned ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.success && result.suggestion) {
      return result.suggestion;
    }

    return null;
  } catch (error) {
    console.error('[Duration Suggestion] Fetch error:', error);
    return null;
  }
}
