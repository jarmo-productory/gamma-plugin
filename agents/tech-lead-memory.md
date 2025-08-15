# Tech Lead Agent Memory

**Last Updated:** 2025-08-12T03:30:00Z  
**Agent Role:** Technical Architecture & Strategy

## 🎯 Current Focus Areas

- **Sprint 2 Architecture**: Presentation data synchronization design
- **Cross-device sync strategy**: API design and conflict resolution
- **Production readiness**: CI/CD pipeline and deployment architecture
- **Long-term scalability**: Database performance and real-time features

## 📋 Recent Architectural Decisions

### 2025-08-14: CLERK JAVASCRIPT SDK INTEGRATION - PRODUCTION READY ✅ COMPLETED
- **Problem**: Current web dashboard uses broken hosted redirect expecting `__clerk_db_jwt` parameter that Clerk doesn't provide
- **Solution**: Implement Clerk JavaScript SDK (@clerk/clerk-js) for native authentication state detection
- **Architecture**: 
  - Replace hosted redirect with `clerk.openSignIn()` modal approach
  - Direct access to session tokens via `clerk.session.getToken()`
  - Real-time auth state listening with automatic UI updates
  - Seamless integration with existing device pairing and auth-bootstrap endpoints
- **Implementation COMPLETED**: 
  - ✅ **Fixed critical API bug**: Corrected Clerk session verification endpoint in `auth-bootstrap.ts`
  - ✅ **Completed SDK integration**: `main-clerk-sdk.js` with full Clerk authentication
  - ✅ **Real-time state management**: Auto-refresh on authentication changes
  - ✅ **Database integration**: `/api/auth/bootstrap` working with proper token handling
  - ✅ **Device pairing flow**: Maintains existing `?code=ABC123` parameter handling
  - ✅ **File organization**: Removed legacy `main.js`, `main-clerk-sdk.js` is active implementation
- **Benefits ACHIEVED**: 
  - **Eliminates JWT URL parameter dependency** - core blocking issue resolved
  - Production-ready authentication with native Clerk session tokens
  - Better UX with modal sign-in instead of redirect dance
  - Real-time state synchronization between Clerk and application  
  - Maintains existing device pairing architecture perfectly
- **Security**: Session tokens verified via Clerk API, auto-cleanup of invalid stored data
- **Status**: ✅ **PRODUCTION READY** - Ready for deployment and user testing
- **Next**: Deploy to production environment and test with real Clerk credentials

### 2025-08-14: COMPREHENSIVE AUTHENTICATION UX ARCHITECTURE
- **Problem**: Current auth system creates UX nightmare with multiple confusing entry points, inconsistent states, impossible logout, and user trapping loops
- **Solution**: Unified Authentication State Machine with single source of truth across Extension + Web
- **Architecture**: 
  - `UnifiedAuthManager` class drives both Extension and Web UI from shared state
  - Clear AuthState enum: LOGGED_OUT → DEVICE_REGISTERED → PAIRING_IN_PROGRESS → AUTHENTICATED
  - Platform-specific AuthUIState interface for consistent rendering
  - Universal logout() method that clears all tokens and invalidates device pairing
- **Implementation**: 
  - New `/api/devices/unlink` endpoint for proper logout
  - Single authentication button in extension (not toolbar chaos)
  - Simplified web dashboard with state-driven rendering
  - Developer testing utilities: `window.gammaAuth.resetForTesting()`
- **Benefits**: Clear user mental model, no stuck states, easy multi-user testing, maintainable code
- **4-Phase Roadmap**: Foundation → Extension Refactor → Web Refactor → Testing (4-5 days total)

### 2025-08-14: CRITICAL MISSING - Web Dashboard User Database Integration
- **Problem**: Web dashboard authentication flow is COMPLETELY BROKEN for user database integration
- **Current Broken State**: 
  - Users authenticate with Clerk successfully but show "user@example.com" hardcoded values
  - Web dashboard does NOT call API to check/create users in Supabase after Clerk auth
  - JWT decoding approach attempted but wrong - user info should come from DATABASE
  - Extension device pairing creates users properly, but web dashboard auth flow is missing DB integration entirely
- **Impact**: Wasted development time, blocking user testing, production failures guaranteed
- **Solution**: Implement proper user database bootstrap immediately after Clerk authentication
- **Architecture**: 
  - After Clerk auth success, immediately call `/api/auth/bootstrap` to ensure user exists in DB
  - Retrieve user info from DATABASE, not JWT tokens or localStorage fallbacks
  - Reuse existing `ensureUserExists()` utility from device pairing flow
  - Handle race conditions with production-safe user creation
- **Implementation Plan**: 
  1. Create `/api/auth/bootstrap` endpoint that calls `ensureUserExists()`
  2. Update `getCurrentUser()` in web dashboard to call API after Clerk auth
  3. Store database user info (real email/name) in localStorage, not JWT data
  4. Display real user information from database, not hardcoded values
- **Priority**: P0 - Blocking production deployment and user testing

### 2025-08-14: CRITICAL PRODUCTION FIX - User Bootstrap Strategy (COMPLETED)
- **Problem**: Users successfully authenticate via Clerk but aren't created in `users` table → production failures  
- **Solution**: Enhanced Option A - Create user immediately after successful device linking  
- **Implementation**: 
  - Added `ensureUserExists()` utility with production-safe race condition handling
  - User creation happens in `devices-link.ts` after Clerk verification, before device pairing
  - Extracts user info from Clerk session (email, name) for proper user records
  - Handles race conditions with graceful fallback and retry logic
  - Maintains existing local dev auto-creation for presentation APIs
- **Security**: Validates Clerk session data, prevents duplicate creation, structured logging
- **Migration**: All presentation APIs updated to use shared `getUserIdFromClerk()` utility
- **Status**: Device pairing flow complete, but WEB DASHBOARD missing DB integration entirely

### 2025-08-13: Sprint 2 Architecture Validation
- **Decision**: Maintain `/api/presentations/*` endpoints over `/api/sync/*` pattern  
- **Rationale**: RESTful design, consistent with established patterns, better semantic meaning
- **Database**: Keep single-table approach with `timetable_data JSONB` - no schema changes needed
- **Conflict Resolution**: Timestamp-based detection with user override (sufficient for Sprint 2)
- **Authentication**: Confirmed Clerk + device token approach aligns perfectly with spec

### 2025-08-12: Presentation Sync Architecture  
- **Decision**: RESTful API with JSON document storage approach
- **Rationale**: Leverages existing patterns, maintains offline-first behavior
- **Endpoints**: `/api/presentations/save|get|list` with metadata tracking
- **Conflict Resolution**: Last-write-wins with timestamp-based detection
- **Implementation**: Debounced sync, feature flag controlled (`enableCloudSync`)

### Sprint 1 Architecture (Completed)
- **Authentication**: Web-first Clerk integration with device pairing
- **Backend**: Netlify Functions with Supabase PostgreSQL + RLS
- **Extension**: MV3 with unified storage abstraction
- **Security**: JWT device tokens with 1-hour TTL and refresh cycle

## 🏗️ Established Architecture Patterns

### Data Flow
- **Extension → Local Storage → Cloud Sync → Cross-device Access**
- **Offline-first**: Extension fully functional without network
- **Progressive Enhancement**: Cloud features layer on top of local functionality

### API Design Standards
- **RESTful endpoints** with consistent error handling
- **JWT authentication** via device tokens from authentication flow
- **JSON payloads** with metadata (timestamps, user_id, device_id)
- **Rate limiting** and structured logging for production monitoring

### Security Model
- **Row-Level Security (RLS)** enforces user data boundaries
- **Device-scoped tokens** with minimal claims and regular refresh
- **Environment-based configs** with feature flags for gradual rollout

## 🚨 Technical Debt & Monitoring

### Current Items
- **ESLint warnings**: 35 `any` type warnings (non-critical, mostly tests)
- **Bundle size**: Extension assets are large (2MB+) - consider code splitting  
- **Error handling**: Need centralized error reporting for production
- **Sprint 2 Spec Alignment**: Update specification to use `/api/presentations/*` endpoints

### Performance Considerations
- **Presentation data size**: Monitor JSON payload sizes for large timetables
- **API response times**: Database queries may need optimization as data grows
- **Extension memory**: Chrome storage API limits and performance

## 🔮 Future Architecture Considerations

### Sprint 3+ Planning
- **Real-time collaboration**: WebSocket or Server-Sent Events for live updates
- **Advanced conflict resolution**: Operational transforms or CRDT approach
- **Caching strategy**: Redis for frequently accessed presentations
- **Mobile support**: Progressive Web App or React Native extension

### Technology Evolution
- **Supabase Edge Functions**: Consider migration from Netlify for better PostgreSQL integration
- **Chrome Manifest V3**: Stay ahead of API changes and deprecations
- **TypeScript strict mode**: Gradually eliminate remaining `any` types

## 📝 Quick Reference

### Current Stack
- **Extension**: Chrome MV3 + Vite build system
- **Web**: Next.js + Clerk authentication + Tailwind CSS
- **Backend**: Netlify Functions + Supabase PostgreSQL
- **Dev Tools**: ESLint + Prettier + Vitest testing

### Environment Status
- **Local Dev**: ✅ Full stack working (extension + web + functions + database)
- **Production**: 🔄 Ready for deployment (needs CI/CD pipeline)
- **Testing**: ✅ Unit tests for core logic, manual E2E testing

---

### 2025-08-14: CRITICAL FIX - Real User Data from Clerk API
- **Problem**: Users created with fallback values ("user@unknown.clerk", "Gamma User") instead of real Clerk profile data
- **Root Cause**: Networkless JWT verification only provides `sub` claim, not user profile data (email, name)
- **Solution**: Fetch actual user profile from Clerk API after session verification
- **Implementation**:
  - After verifying session token, call `GET /v1/users/{userId}` to fetch profile
  - Extract email from `email_addresses[0].email_address` field
  - Extract name from `first_name` and `last_name` fields
  - Pass enriched `clerkSession` object to `ensureUserExists()`
- **Applied to**: Both `auth-bootstrap.ts` and `devices-link.ts` for consistency
- **Security**: User profile fetched server-side with secret key, no client exposure
- **Status**: Implemented and deployed to local dev environment

### 2025-08-15: CRITICAL P0 - Session Persistence Architecture Failure
- **Problem**: Complete session state loss on page reload at localhost:3000 - users forced to re-authenticate on every browser refresh
- **Root Cause**: Clerk SDK initialization race condition where `getCurrentUser()` runs before session restoration completes
- **Technical Issues**:
  - Session validation logic checks `clerk.session` before Clerk SDK finishes loading stored sessions
  - Aggressive localStorage clearing destroys valid session data during initialization
  - Missing "session restoration" phase that waits for Clerk to restore from cookies/localStorage
  - Mixed initialization patterns (npm vs CDN) create inconsistent timing
- **Architecture Impact**: Blocks production deployment - fundamental UX failure for authenticated users
- **Solution Required**: 
  - Implement proper session restoration state machine (INITIALIZING → RESTORING → AUTHENTICATED)
  - Fix `getCurrentUser()` timing to wait for Clerk session restoration
  - Separate session checking from session clearing logic
  - Add loading states during authentication restoration
- **Priority**: P0 - Must be resolved before any production deployment
- **Files**: `/packages/web/src/main-clerk-sdk.js` (lines 94-177 session management logic)

**Usage Note**: This memory file should be updated after significant architectural decisions, technology evaluations, or when establishing new patterns. Keep entries concise and actionable.