# SPRINT 13: Production Authentication Redirect Fix
*Created: August 28, 2025*
*Duration: 1-2 hours*
*Status: READY FOR EXECUTION*

## Sprint Objective
Fix Google OAuth redirect URLs to work correctly in production (Netlify) environment by implementing environment-aware redirect URL generation and Supabase OAuth configuration.

## Problem Analysis ✅

### Root Cause Identified
**Issue**: Google OAuth redirects users back to `localhost:3000` instead of production Netlify URL after successful authentication.

**Technical Analysis:**
1. **AuthForm.tsx Lines 116, 148**: Uses `location.origin` for redirect URLs
   - Development: `location.origin` = `http://localhost:3000` ✅
   - Production: `location.origin` = `https://productory-powerups.netlify.app` ✅ 
   - **Code works correctly** - dynamically adapts to environment

2. **Environment Configuration**: 
   - `.env.local` contains `NEXT_PUBLIC_APP_URL=http://localhost:3000` (dev only)
   - No production environment variables configured in Netlify

3. **Supabase OAuth Settings**: 
   - Likely configured with localhost URLs only
   - Missing production callback URL: `https://productory-powerups.netlify.app/auth/callback`

## Scope Definition
- ✅ Fix production OAuth redirect URLs  
- ✅ Configure Supabase OAuth settings for production domain
- ✅ Implement environment-aware URL generation
- ✅ Add Netlify environment variables
- ❌ No authentication flow changes
- ❌ No UI/UX modifications needed

## Technical Solution Strategy

### Issue Location: Supabase OAuth Configuration
**Primary Fix Required**: Add production callback URL to Supabase Auth settings

### Secondary Fixes Required:
1. **Netlify Environment Variables**: Add production URL configuration
2. **Environment Detection**: Ensure robust production URL handling
3. **OAuth Redirect Validation**: Test full auth flow in production

## Implementation Plan

### Phase 1: Supabase OAuth Configuration (30 minutes)
**Critical Task**: Update Supabase Auth settings

**Steps:**
1. **Access Supabase Dashboard**: https://dknqqcnnbcqujeffbmmb.supabase.co
2. **Navigate**: Authentication → Settings → URL Configuration  
3. **Add Production URLs**:
   - Site URL: `https://productory-powerups.netlify.app`
   - Redirect URLs: Add `https://productory-powerups.netlify.app/auth/callback`
4. **Verify OAuth Provider Settings**: Ensure Google OAuth has production callback URLs

### Phase 2: Netlify Environment Variables (15 minutes)
**Task**: Configure production environment variables

**Required Variables:**
```bash
# Production Environment Variables for Netlify
NEXT_PUBLIC_SUPABASE_URL=https://dknqqcnnbcqujeffbmmb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM
NEXT_PUBLIC_APP_URL=https://productory-powerups.netlify.app
```

**Implementation:**
1. **Netlify Dashboard**: Access productory-powerups site
2. **Environment Variables**: Site Settings → Environment Variables
3. **Add Variables**: Copy from `.env.local` with production URLs
4. **Deploy**: Trigger rebuild with new environment variables

### Phase 3: Code Verification (15 minutes)
**Task**: Verify current code handles production correctly

**Current Code Analysis:**
- ✅ **AuthForm.tsx**: `location.origin` automatically detects production URL
- ✅ **Callback Route**: Uses `origin` from request URL (production-aware)
- ✅ **Dynamic Redirect**: Code should work without modifications

**Verification Steps:**
1. **Build Test**: Ensure production build works with new environment variables
2. **Deployment**: Deploy to Netlify and test auth flow
3. **End-to-End Test**: Complete Google OAuth flow in production

### Phase 4: Production Testing (30 minutes)
**Task**: Validate complete authentication flow

**Test Scenarios:**
1. **Google Sign In**: Click "Continue with Google" → Should redirect to production after auth
2. **Email Signup**: Email confirmation should redirect to production callback
3. **Email Sign In**: Standard email/password should redirect to dashboard
4. **Error Handling**: Invalid auth should redirect to production error page

## Risk Assessment & Mitigation

### Low Risk Issues
1. **Environment Variables**: Simple configuration, no code changes needed
2. **Supabase Settings**: Non-breaking changes, existing localhost URLs remain functional

### Medium Risk Issues  
1. **OAuth Provider Sync**: Google OAuth settings may need production URL registration
2. **Email Templates**: Supabase email templates might reference localhost URLs

### Mitigation Strategy
1. **Backup Plan**: Keep localhost URLs configured alongside production URLs
2. **Incremental Testing**: Test each auth method separately
3. **Rollback Ready**: Can revert Supabase settings if issues arise

## Success Criteria

### Technical Validation
- ✅ Google OAuth redirects to `https://productory-powerups.netlify.app/auth/callback` after authentication
- ✅ Email confirmation links redirect to production domain
- ✅ All authentication methods work in production environment
- ✅ Localhost development environment remains functional

### User Experience Validation  
- ✅ Users can complete full auth flow in production without localhost references
- ✅ After Google auth, users land on production dashboard
- ✅ Email signup confirmation works with production URLs
- ✅ Error states show production-appropriate messaging

### Quality Assurance
- ✅ Development environment unaffected by production configuration
- ✅ Both localhost and production OAuth flows working simultaneously
- ✅ No broken auth states or redirect loops

## Implementation Checklist

### Pre-Sprint Setup
- [ ] Access to Supabase dashboard for OAuth configuration
- [ ] Access to Netlify dashboard for environment variables
- [ ] Production URL confirmed: `https://productory-powerups.netlify.app`

### Sprint Execution
- [✅] **Netlify Env Vars**: Add `NEXT_PUBLIC_APP_URL` and Supabase credentials
- [✅] **Deploy**: Trigger Netlify rebuild with new environment variables
- [✅] **Verify Production Site**: Confirm https://productory-powerups.netlify.app loads correctly
- [✅] **Verify Supabase Connection**: Confirm database connectivity in production
- [🟡] **Supabase OAuth**: Add production callback URL to Site URLs and Redirect URLs (MANUAL STEP REQUIRED)
- [⏳] **Google OAuth**: Verify Google Console has production callback registered
- [⏳] **Test Auth Flow**: Complete Google OAuth in production
- [⏳] **Test Email Auth**: Verify email signup/signin redirects correctly
- [⏳] **Validate Development**: Ensure localhost auth still works

### Post-Sprint Validation
- [ ] **Production Test**: Full auth flow working on live site
- [ ] **Development Test**: Local development auth flow unaffected  
- [ ] **Documentation**: Update environment setup documentation
- [ ] **Monitoring**: No auth errors in production logs

## Definition of Done

**Authentication Flow Fixed:**
- Google OAuth redirects to production URL after authentication ✅
- Email confirmation links use production domain ✅
- All auth methods work correctly in production ✅
- Development environment remains fully functional ✅

**Configuration Complete:**
- Supabase OAuth settings include production URLs ✅
- Netlify environment variables configured ✅
- Production deployment successful with auth working ✅

**Quality Verified:**
- No localhost references in production auth flow ✅
- Error handling works correctly in production ✅
- Both environments (dev/prod) working simultaneously ✅

---

**Sprint Owner**: Jarmo Tuisk  
**Assigned to**: Claude III (Web App) + Manual Supabase Configuration  
**Dependencies**: Access to Supabase dashboard, Netlify admin access  
**Estimated Time**: 1-2 hours total execution  
**Priority**: High (blocks production user onboarding)

**Next Sprint**: Feature development with production-ready authentication flow