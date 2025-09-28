import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache configuration for different endpoint types
 */
export const CACHE_CONFIG = {
  presentations: {
    list: {
      maxAge: 60, // 1 minute for private cache
      sMaxAge: 300, // 5 minutes for shared cache
      staleWhileRevalidate: 120, // 2 minutes stale-while-revalidate
    },
    detail: {
      maxAge: 120, // 2 minutes for private cache
      sMaxAge: 600, // 10 minutes for shared cache
      staleWhileRevalidate: 300, // 5 minutes stale-while-revalidate
    },
  },
  user: {
    profile: {
      maxAge: 300, // 5 minutes for private cache
      sMaxAge: 0, // No shared cache for user data
      staleWhileRevalidate: 60, // 1 minute stale-while-revalidate
    },
  },
} as const;

/**
 * Generate ETag from data using SHA-256 hash
 */
export function generateETag(data: any): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Generate ETag from multiple data sources
 */
export function generateETagFromSources(...sources: any[]): string {
  const combined = sources.reduce((acc, source) => {
    return { ...acc, ...source };
  }, {});
  return generateETag(combined);
}

/**
 * Create Cache-Control header value
 */
export function createCacheControlHeader(config: {
  maxAge: number;
  sMaxAge: number;
  staleWhileRevalidate?: number;
  private?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
}): string {
  const parts: string[] = [];

  if (config.noCache) {
    parts.push('no-cache');
  } else {
    if (config.private) {
      parts.push('private');
    }

    parts.push(`max-age=${config.maxAge}`);

    if (config.sMaxAge > 0) {
      parts.push(`s-maxage=${config.sMaxAge}`);
    }

    if (config.staleWhileRevalidate) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    if (config.mustRevalidate) {
      parts.push('must-revalidate');
    }
  }

  return parts.join(', ');
}

/**
 * Check if request has conditional headers and handle 304 responses
 */
export function handleConditionalRequest(
  request: NextRequest,
  etag: string
): NextResponse | null {
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch) {
    // Handle weak ETags and multiple ETags
    const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());
    const matchesETag = clientETags.some(clientTag => {
      // Remove W/ prefix for weak ETags
      const normalizedClientTag = clientTag.replace(/^W\//, '');
      const normalizedServerTag = etag.replace(/^W\//, '');
      return normalizedClientTag === normalizedServerTag;
    });

    if (matchesETag) {
      // Return 304 Not Modified
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': createCacheControlHeader({
            private: true,
            maxAge: CACHE_CONFIG.presentations.list.maxAge,
            sMaxAge: CACHE_CONFIG.presentations.list.sMaxAge,
            staleWhileRevalidate: CACHE_CONFIG.presentations.list.staleWhileRevalidate,
          }),
        },
      });
    }
  }

  return null;
}

/**
 * Add cache headers to response
 */
export function addCacheHeaders(
  response: NextResponse,
  etag: string,
  cacheConfig: {
    maxAge: number;
    sMaxAge: number;
    staleWhileRevalidate?: number;
    private?: boolean;
  }
): NextResponse {
  response.headers.set('ETag', etag);
  response.headers.set('Cache-Control', createCacheControlHeader({
    private: cacheConfig.private ?? true,
    maxAge: cacheConfig.maxAge,
    sMaxAge: cacheConfig.sMaxAge,
    staleWhileRevalidate: cacheConfig.staleWhileRevalidate,
  }));

  // Add Vary header for conditional requests
  response.headers.set('Vary', 'Authorization, If-None-Match');

  return response;
}

/**
 * Middleware-style cache handler for API routes
 */
export function withCaching<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  cacheConfig: {
    maxAge: number;
    sMaxAge: number;
    staleWhileRevalidate?: number;
    private?: boolean;
    generateETag: (data: any) => string;
  }
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    try {
      // Execute the original handler
      const response = await handler(...args);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const responseClone = response.clone();
        const data = await responseClone.json();

        // Generate ETag from response data
        const etag = cacheConfig.generateETag(data);

        // Check conditional request
        const conditionalResponse = handleConditionalRequest(request, etag);
        if (conditionalResponse) {
          return conditionalResponse;
        }

        // Add cache headers to successful response
        return addCacheHeaders(response, etag, cacheConfig);
      }

      return response;
    } catch (error) {
      // Don't cache error responses
      throw error;
    }
  };
}

/**
 * Generate ETag for presentations list based on latest update time and count
 */
export function generatePresentationsListETag(presentations: any[]): string {
  if (!presentations.length) {
    return generateETag({ count: 0, timestamp: new Date().toISOString() });
  }

  // Sort by updatedAt to get the latest
  const sortedPresentations = presentations.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const latestUpdate = sortedPresentations[0]?.updatedAt;
  const count = presentations.length;

  return generateETag({
    count,
    latestUpdate,
    // Include presentation IDs for structural changes
    ids: presentations.map(p => p.id).sort(),
  });
}

/**
 * Generate ETag for single presentation based on updated time and data hash
 */
export function generatePresentationDetailETag(presentation: any): string {
  return generateETag({
    id: presentation.id,
    updatedAt: presentation.updatedAt,
    // Include timetable data hash for content changes
    timetableHash: presentation.timetableData ?
      createHash('sha256').update(JSON.stringify(presentation.timetableData)).digest('hex') :
      null,
  });
}