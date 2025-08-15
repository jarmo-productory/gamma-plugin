# Session Persistence Test Guide

## Test Setup

1. **Start the development server:**
   ```bash
   npm run dev:web
   ```

2. **Open browser with DevTools:**
   - Navigate to http://localhost:3000
   - Open Chrome DevTools (F12)
   - Go to Console tab to see debug logs

## Test Scenarios

### Test 1: Initial Sign In
1. Clear all site data:
   - DevTools → Application → Storage → Clear site data
2. Navigate to http://localhost:3000
3. Click "Get Started" or "Sign In with Clerk"
4. Complete authentication
5. **Expected Result:**
   - Console shows: `[Auth] Clerk SDK initialized successfully`
   - Console shows: `[Auth] User authenticated with Clerk, bootstrapping from database...`
   - Dashboard shows user's name/email
   - User remains signed in

### Test 2: Page Refresh (F5)
1. After successful sign in from Test 1
2. Press F5 to refresh the page
3. **Expected Result:**
   - Console shows: `[Auth] Restoring session...` briefly
   - Console shows: `[Auth] Clerk SDK initialized successfully` with `hasSession: true`
   - User REMAINS signed in
   - Dashboard shows user's name/email
   - NO "Sign In" button appears

### Test 3: Hard Refresh (Ctrl+F5)
1. After successful sign in
2. Press Ctrl+F5 (hard refresh)
3. **Expected Result:**
   - Same as Test 2 - user remains signed in

### Test 4: Close and Reopen Tab
1. After successful sign in
2. Close the browser tab
3. Open a new tab and navigate to http://localhost:3000
4. **Expected Result:**
   - User remains signed in
   - Dashboard shows authenticated state

### Test 5: Browser Restart
1. After successful sign in
2. Close the entire browser
3. Reopen browser and navigate to http://localhost:3000
4. **Expected Result:**
   - User remains signed in (Clerk persists sessions)

### Test 6: Explicit Sign Out
1. After successful sign in
2. Click "Sign Out" button
3. **Expected Result:**
   - Console shows: `[Auth] Successfully signed out from Clerk`
   - LocalStorage is cleared
   - User sees landing page with "Get Started" button
   - Refreshing page keeps user signed out

## Debug Console Output

### Successful Session Restoration
```
[Auth] Initializing Clerk SDK...
[Auth] Using Clerk SDK from npm package
[Auth] Clerk SDK initialized successfully {loaded: true, hasSession: true, hasUser: true}
[Auth] Checking authentication state {loaded: true, hasUser: true, hasSession: true, sessionId: "sess_xxx"}
[Auth] User authenticated with Clerk, bootstrapping from database...
[Auth] User bootstrapped from database: {id: "xxx", email: "user@example.com", name: "John Doe"}
[Dashboard] Render state: {isAuthenticated: true, user: {...}, clerkLoaded: true, clerkSession: true}
```

### Session Not Found (After Sign Out)
```
[Auth] Initializing Clerk SDK...
[Auth] Clerk SDK initialized successfully {loaded: true, hasSession: false, hasUser: false}
[Auth] Checking authentication state {loaded: true, hasUser: false, hasSession: false}
[Auth] Found stored session data but Clerk has no active session - clearing stale data
[Dashboard] Render state: {isAuthenticated: false, user: null, clerkLoaded: true, clerkSession: false}
```

## Common Issues and Solutions

### Issue: Still losing session on refresh
**Check:**
- Console for `[Auth] Clerk SDK still loading` - should retry automatically
- Console for `[Auth] Clearing invalid stored session data` - should ONLY appear when truly signed out
- Network tab for failed API calls

### Issue: "Restoring session..." stuck
**Check:**
- Console for errors in Clerk initialization
- Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set correctly
- Check if Clerk CDN is accessible

### Issue: User data shows fallback values
**Check:**
- `/api/auth/bootstrap` endpoint response
- Database connection and user creation
- Clerk user profile API integration

## Success Criteria
✅ User stays logged in after F5 refresh
✅ User stays logged in after browser restart
✅ No premature localStorage clearing
✅ Proper loading states during session restoration
✅ Sign out actually signs user out