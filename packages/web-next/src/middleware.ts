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

// Define routes that should bypass Clerk middleware entirely
const isPublicApiRoute = createRouteMatcher([
  '/api/auth/bootstrap(.*)',  // Our custom auth endpoint
  '/api/health(.*)',          // Health check endpoints
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
      // Skip Clerk processing for public API routes
      if (isPublicApiRoute(req)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Middleware] Bypassing Clerk for public API:', req.nextUrl.pathname);
        }
        return NextResponse.next();
      }

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
    // Run for specific API routes (exclude auth/bootstrap)
    '/api/((?!auth/bootstrap).)*',
    // Run for trpc routes 
    '/(trpc)(.*)',
  ],
};