import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define which routes should be protected
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/protected(.*)',
  '/settings(.*)',
  '/presentations(.*)',
]);

// Check if we're using placeholder keys
const isPlaceholderAuth = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  return key.includes('example') || key.includes('test_Y2xlcms') || !key;
};

// Export the middleware with protection logic
const middleware = isPlaceholderAuth() 
  ? (req: NextRequest) => {
      // Skip auth in development with placeholder keys
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Skipping auth (placeholder keys):', req.nextUrl.pathname);
      }
      return NextResponse.next();
    }
  : clerkMiddleware((auth, req) => {
      // Log middleware execution in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Processing:', req.nextUrl.pathname);
      }

      // Protect specific routes
      if (isProtectedRoute(req)) {
        // This will redirect to sign-in if not authenticated
        auth.protect();
      }
      
      // All other routes are public by default
    });

export default middleware;

export const config = {
  // The middleware will only run on these paths
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};