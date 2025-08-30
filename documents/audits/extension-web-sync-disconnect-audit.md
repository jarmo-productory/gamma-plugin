# Extension-Web Sync Disconnect Audit

**Date**: August 29, 2025  
**Issue**: User has Chrome extension installed and connected to account, but Timetables page shows "No Timetables Yet"  
**Sprint Context**: Sprint 17 (API Alignment) marked complete, but sync still not working  

## Problem Statement

**Observed Behavior:**
- ✅ Chrome extension installed and connected to user account
- ✅ Web dashboard loads correctly at `/gamma/timetables`
- ❌ **CRITICAL**: Timetables page shows "No Timetables Yet" instead of extension-created presentations
- ❌ Extension → Web sync appears completely broken despite Sprint 17 completion

**Expected Behavior:**
- Extension creates timetables from Gamma presentations
- Timetables automatically appear in web dashboard `/gamma/timetables`
- User sees presentation cards with export/delete functionality

## Audit Methodology

### Phase 1: Database State Verification
**Check if extension data exists in database**

### Phase 2: API Endpoint Validation  
**Verify Sprint 17 implementation actually works**

### Phase 3: Frontend Data Flow Analysis
**Check if Timetables page connects to correct API endpoints**

### Phase 4: Extension Integration Testing
**Test actual extension → API → database → web flow**

## Findings

### 🔍 Database State Analysis

**Query**: Check presentations table for user data
```sql
SELECT COUNT(*) FROM presentations WHERE user_id = '[user_id]';
SELECT * FROM presentations ORDER BY created_at DESC LIMIT 5;
```

**Expected**: If extension is working, should have presentation records  
**Finding**: [TO BE DETERMINED]

### 🔍 API Endpoint Verification

**Test Sprint 17 Implementation:**

1. **GET /api/presentations/list** - Should return user's presentations
   - Expected: Array of presentation objects
   - Authentication: Should work with both Supabase sessions and device tokens

2. **GET /api/presentations/get?url=[gamma_url]** - New endpoint from Sprint 17  
   - Expected: Single presentation data
   - Should support device token authentication

3. **POST /api/presentations/save** - Extension save endpoint
   - Expected: Accept timetable data from extension
   - Should create database records visible to web dashboard

**API Test Results**: [TO BE DETERMINED]

### 🔍 Frontend Integration Analysis

**Timetables Page Data Flow:**
```
/gamma/timetables → TimetablesClient → API call → Database → Response → UI render
```

**Critical Questions:**
1. Does `/gamma/timetables` actually call `/api/presentations/list`?
2. Is the API call authenticated with user's Supabase session?
3. Does the response format match what the frontend expects?
4. Are there any console errors during data loading?

### 🔍 Extension Integration Points

**Extension → API Flow:**
1. **Device Registration**: Extension registers with `/api/devices/register`
2. **Device Linking**: User links device via `/api/devices/link`  
3. **Token Exchange**: Extension gets auth token via `/api/devices/exchange`
4. **Data Sync**: Extension saves timetables via `/api/presentations/save`

**Potential Break Points:**
- Device registration/linking incomplete
- Token exchange failing or tokens invalid
- Extension not actually calling save API
- Payload format mismatch between extension and API

## Investigation Tasks

### Task 1: Database Verification
- [ ] Check presentations table row count
- [ ] Verify user_id associations are correct
- [ ] Check device_tokens table for active user tokens

### Task 2: API Endpoint Testing
- [ ] Test `/api/presentations/list` with user session auth
- [ ] Test `/api/presentations/save` with device token auth  
- [ ] Verify Sprint 17 auth-helpers middleware working
- [ ] Check API response formats match frontend expectations

### Task 3: Frontend Data Loading
- [ ] Inspect `/gamma/timetables` network requests
- [ ] Check for JavaScript console errors
- [ ] Verify authentication headers in API calls
- [ ] Test API calls return expected data structure

### Task 4: Extension Integration
- [ ] Verify extension device pairing completed successfully
- [ ] Check extension console for save/sync errors
- [ ] Test extension → API communication manually
- [ ] Validate token expiration and refresh

## Hypothesis: Most Likely Root Causes

### Primary Suspects (High Probability)

**1. Frontend Not Calling Correct API** 
- Timetables page may not be implemented to call `/api/presentations/list`
- Could be calling non-existent or wrong endpoint
- Missing authentication headers

**2. Extension Not Actually Saving Data**
- Device pairing appears successful but token invalid
- Extension save calls failing silently  
- Payload format mismatch preventing database writes

**3. User ID Mapping Issues**
- Device token user_id doesn't match Supabase auth user ID
- Data saved under different user ID than web session
- RLS policies blocking cross-auth-method access

### Secondary Suspects (Medium Probability)

**4. Sprint 17 Implementation Incomplete**
- Auth helpers not properly integrated
- API endpoints missing device token support
- Database queries filtering out user data incorrectly

**5. Data Format Mismatch**  
- Extension saves in different schema than web expects
- API response format doesn't match frontend expectations
- Missing required fields causing silent failures

## Investigation Priority

**IMMEDIATE (P0):**
1. Check database for any presentation data
2. Test `/api/presentations/list` endpoint manually
3. Inspect Timetables page network requests

**HIGH (P1):**  
4. Verify extension device token validity
5. Test extension → API save flow
6. Check user ID mapping consistency

**MEDIUM (P2):**
7. Frontend error handling analysis
8. End-to-end integration testing
9. Performance and caching investigation

## Expected Resolution

**Most Likely Fix:**
- Frontend integration issue (Timetables page not calling API)
- Missing API call implementation in TimetablesClient component

**Timeline**: Should be resolvable within 1-2 hours once root cause identified

**Success Criteria:**
- Timetables page shows presentation cards instead of "No Timetables Yet"  
- Extension-created timetables appear immediately in web dashboard
- Export and delete functionality works for synced presentations

---

**Status**: Investigation in progress  
**Next Steps**: Execute investigation tasks starting with database verification