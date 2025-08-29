# Supabase OAuth Configuration for Production

## Issue
Google OAuth redirects users back to `localhost:3000` instead of production Netlify URL after successful authentication.

## Required Manual Configuration

### Step 1: Access Supabase Dashboard
- URL: https://dknqqcnnbcqujeffbmmb.supabase.co
- Navigate to: Authentication → Settings → URL Configuration

### Step 2: Update Site URLs
Add the production URL to Site URLs:
```
https://productory-powerups.netlify.app
```

### Step 3: Update Redirect URLs  
Add the production callback URL to Redirect URLs:
```
https://productory-powerups.netlify.app/auth/callback
```

### Step 4: Verify OAuth Provider Settings
Ensure Google OAuth provider is configured to accept callbacks from production domain.

## Current Configuration Status
- ✅ Netlify Environment Variables: `NEXT_PUBLIC_APP_URL=https://productory-powerups.netlify.app` 
- ✅ Code Implementation: `AuthForm.tsx` uses `location.origin` (production-aware)
- ✅ Callback Route: `/auth/callback` properly handles production redirects
- ✅ Production Site Deployment: https://productory-powerups.netlify.app (loading correctly)
- ✅ Supabase Connection: API endpoint `/test-db` confirms production database connectivity
- 🟡 **NEXT STEP**: Manual Supabase OAuth configuration required (see steps above)

## Testing After Configuration
1. Visit: https://productory-powerups.netlify.app
2. Click "Continue with Google"
3. Complete Google OAuth flow
4. Verify redirect returns to: `https://productory-powerups.netlify.app/auth/callback?next=/dashboard`
5. Confirm successful authentication and redirect to dashboard

## Environment Variables Configured
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dknqqcnnbcqujeffbmmb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM
NEXT_PUBLIC_APP_URL=https://productory-powerups.netlify.app
```

Configuration completed on: August 29, 2025
Sprint: Sprint 13 - Production Authentication Redirect Fix