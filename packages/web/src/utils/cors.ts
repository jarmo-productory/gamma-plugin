import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration for Chrome Extension Support
 *
 * Handles CORS headers for requests from Chrome extensions with credentials.
 * Cannot use wildcard '*' with credentials mode, so we dynamically set the origin.
 */

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';

  // Allow Chrome extension origins and our domains
  const allowedOrigins = [
    'chrome-extension://bhoijiicgpeihilgcfndkgkifmhccnjn',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://productory-powerups.netlify.app'
  ];

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) ||
                    origin.startsWith('chrome-extension://');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const headers = getCorsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function handleOPTIONS(request: NextRequest): NextResponse {
  const headers = getCorsHeaders(request);
  return new NextResponse(null, { status: 204, headers });
}
