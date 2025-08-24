/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Clerk Authentication
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
      CLERK_SECRET_KEY: string;
      
      // Optional Clerk Configuration
      NEXT_PUBLIC_CLERK_API_VERSION?: string;
      NEXT_PUBLIC_CLERK_FRONTEND_API?: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string;
      NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL?: string;
      NEXT_PUBLIC_CLERK_IS_SATELLITE?: string;
      
      // Next.js Environment
      NODE_ENV: 'development' | 'production' | 'test';
      
      // Optional: API URLs (for future use)
      NEXT_PUBLIC_API_URL?: string;
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
    }
  }
}

// Ensure this file is treated as a module
export {};