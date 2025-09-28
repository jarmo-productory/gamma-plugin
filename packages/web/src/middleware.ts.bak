import { NextRequest, NextResponse } from 'next/server'

// Block legacy public debug/test/migrate routes in production unless explicitly enabled
export function middleware(req: NextRequest) {
  const enabled = process.env.ENABLE_INTERNAL_APIS === 'true'
  const { pathname } = req.nextUrl

  // Legacy surfaces to hide unless explicitly enabled
  const legacyPatterns = [
    /^\/api\/debug(?:\/|$)/,
    /^\/api\/test-/,
    /^\/api\/migrate(?:\/|$)/,
  ]

  if (!enabled && legacyPatterns.some((re) => re.test(pathname))) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

// Only match legacy debug/test/migrate paths to avoid touching all API routes
export const config = {
  matcher: ['/api/(debug|test-|migrate)(.*)'],
}
