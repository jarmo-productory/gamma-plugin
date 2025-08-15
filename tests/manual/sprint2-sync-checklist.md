# Sprint 2 Manual Testing Checklist
## Presentation Synchronization Features

**Tester:** ________________  
**Date:** ________________  
**Environment:** [ ] Local Development [ ] Staging [ ] Production  
**Extension Version:** ________________  

## Pre-Test Setup

### Required Services
- [ ] Supabase database running and accessible
- [ ] Netlify dev server running (`npm run dev:web`)
- [ ] Extension loaded in Chrome from dist/ folder
- [ ] Test user account authenticated in extension
- [ ] Valid device token confirmed (check extension storage)

### Test Data Preparation
- [ ] Test gamma.app presentation URL ready: `https://gamma.app/docs/test-presentation-123`
- [ ] Multiple device/browser instances available for cross-device testing
- [ ] Network throttling tools available for performance testing

---

## API Endpoint Testing

### POST /api/presentations/save

#### ✅ Success Scenarios
- [ ] **Basic Save Operation**
  - Open terminal/browser dev tools
  - Execute API call with valid token and presentation data
  - **Expected:** 200 OK response with presentation metadata
  - **Verify:** Response includes `id`, `syncedAt`, `totalDuration`, `itemCount`
  - **Performance:** Response time < 500ms
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Upsert Functionality**  
  - Save same presentation URL twice with different data
  - **Expected:** Second save updates existing record (same ID)
  - **Verify:** Database shows single record with updated data
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Large Presentation (50+ slides)**
  - Create presentation with 50+ slides and rich content
  - **Expected:** Successful save within performance limits
  - **Performance:** Response time < 1000ms for large data
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### ❌ Error Scenarios
- [ ] **Missing Authentication**
  - Remove Authorization header from request
  - **Expected:** 401 Unauthorized, error: "missing_token"
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Expired Token**
  - Use token with past expiration time
  - **Expected:** 401 Unauthorized, error: "expired"
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Invalid Request Data**
  - Send request with missing presentationUrl
  - **Expected:** 400 Bad Request, error: "invalid_presentation_url"
  - Test with missing title: **Expected:** error: "invalid_title"
  - Test with missing timetableData: **Expected:** error: "invalid_timetable_data"
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Rate Limiting**
  - Make 11+ save requests within 1 minute
  - **Expected:** 429 Too Many Requests after 10th request
  - **Verify:** `retryAfter` field present in response
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### GET /api/presentations/get

#### ✅ Success Scenarios
- [ ] **Basic Retrieval**
  - Get existing presentation by URL parameter
  - **Expected:** 200 OK with complete presentation data
  - **Verify:** All timetableData fields preserved accurately
  - **Performance:** Response time < 500ms
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **URL Encoding**
  - Test with URL-encoded presentation URL in query parameter
  - **Expected:** Successful retrieval
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### ❌ Error Scenarios
- [ ] **Missing URL Parameter**
  - Request without ?url= query parameter
  - **Expected:** 400 Bad Request, error: "missing_presentation_url"
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Non-existent Presentation**
  - Request presentation that doesn't exist
  - **Expected:** 404 Not Found, error: "presentation_not_found"
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Cross-user Access**
  - Try to access another user's presentation
  - **Expected:** 404 Not Found (RLS enforcement)
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### GET /api/presentations/list

#### ✅ Success Scenarios
- [ ] **Basic List**
  - Request user's presentations list
  - **Expected:** 200 OK with presentations array and pagination metadata
  - **Verify:** Only user's presentations returned
  - **Performance:** Response time < 500ms
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Pagination**
  - Test with limit=5&offset=0, then limit=5&offset=5
  - **Expected:** Correct pagination behavior
  - **Verify:** `hasMore` field accurate, total count correct
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Sorting**
  - Test sortBy=title&sortOrder=asc
  - Test sortBy=updated_at&sortOrder=desc
  - **Expected:** Results sorted correctly
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### ❌ Error Scenarios
- [ ] **Invalid Sort Field**
  - Use sortBy=invalid_field
  - **Expected:** Falls back to 'updated_at' default
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Integration Testing

### End-to-End Sync Workflow

#### Complete Sync Process
- [ ] **Device A → Cloud → Device B**
  1. Device A: Create timetable for gamma.app presentation
  2. Device A: Trigger "Save to Cloud" operation
  3. Device B: Navigate to same gamma.app presentation  
  4. Device B: Trigger "Load from Cloud" operation
  5. **Expected:** Device B loads timetable identical to Device A
  - **Performance:** Complete sync < 2 seconds
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### Authentication Integration
- [ ] **Token Refresh During Sync**
  - Initiate sync operation when device token near expiration
  - **Expected:** Automatic token refresh, sync completes successfully
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Sync with Expired Authentication**
  - Force token expiration, attempt sync
  - **Expected:** Clear error message, redirect to re-authentication
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### Conflict Resolution
- [ ] **Local vs Cloud Data Conflicts**
  1. Device A: Modify timetable, save to cloud
  2. Device B: Modify same timetable locally (different changes)
  3. Device B: Attempt sync operation
  - **Expected:** Conflict detection and resolution workflow
  - **Verify:** User presented with clear conflict resolution options
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### Cross-Device Synchronization

#### Multi-Device Scenarios
- [ ] **Chrome Extension → Web Dashboard**
  - Save presentation in extension
  - View in web dashboard
  - **Expected:** Presentation appears in dashboard with accurate data
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Web Dashboard → Chrome Extension**
  - Edit presentation in web dashboard
  - Load in extension on different device
  - **Expected:** Extension loads updated data
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Concurrent Editing**
  - Two devices editing same presentation simultaneously
  - Both devices save changes
  - **Expected:** Last save wins, or conflict resolution triggered
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Performance Testing

### Response Time Validation

#### API Performance
- [ ] **Save Operation Performance**
  - Test with 10 slides: **Time:** _____ ms (Target: <500ms)
  - Test with 50 slides: **Time:** _____ ms (Target: <1000ms)
  - Test with 100 slides: **Time:** _____ ms (Target: <2000ms)
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Get Operation Performance**
  - Test retrieval of large presentation (100+ slides)
  - **Time:** _____ ms (Target: <500ms)
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **List Operation Performance**
  - Test with 100+ presentations in account
  - **Time:** _____ ms (Target: <500ms)
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

#### End-to-End Performance
- [ ] **Complete Sync Workflow**
  - Time from "Save to Cloud" click to completion
  - **Time:** _____ seconds (Target: <2s)
  - Time from "Load from Cloud" click to timetable display
  - **Time:** _____ seconds (Target: <2s)
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### Load Testing
- [ ] **Concurrent Users**
  - Simulate 5+ users saving presentations simultaneously
  - **Expected:** No performance degradation or failures
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Data Integrity Testing

### Data Preservation
- [ ] **Unicode Characters**
  - Create presentation with emoji, accented characters, non-Latin scripts
  - Save and retrieve presentation
  - **Expected:** All characters preserved exactly
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Special Content**
  - Test with HTML entities, JSON data, long text content
  - **Expected:** All content preserved without corruption
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Numeric Precision**
  - Test with decimal durations (e.g., 7.5 minutes)
  - **Expected:** Precise numeric values maintained
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### Round-Trip Fidelity
- [ ] **Complete Data Round-Trip**
  1. Create complex timetable with all field types
  2. Save to cloud
  3. Retrieve from cloud
  4. Compare original vs retrieved data
  - **Expected:** 100% data fidelity, no corruption or loss
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Error Handling & User Experience

### Network Error Scenarios
- [ ] **Network Disconnection**
  - Disconnect network during save operation
  - **Expected:** Clear error message, retry option
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **API Server Unavailable**
  - Stop backend services, attempt sync
  - **Expected:** Graceful error handling, user informed
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Slow Network Connection**
  - Throttle network to 3G speeds, test sync
  - **Expected:** Operation completes, loading indicators shown
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### User Interface Validation
- [ ] **Loading States**
  - Verify loading indicators during sync operations
  - **Expected:** Clear visual feedback during async operations
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Success Feedback**
  - Confirm success messages after successful sync
  - **Expected:** Clear confirmation of completed operations
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Error Messages**
  - Verify user-friendly error messages for all failure scenarios
  - **Expected:** Clear, actionable error descriptions
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Security Testing

### Authentication Validation
- [ ] **Token Security**
  - Attempt API calls with invalid/expired tokens
  - **Expected:** Proper authentication errors returned
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **Cross-User Data Access**
  - Attempt to access other users' presentations
  - **Expected:** Access denied, no data leakage
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

### Input Validation
- [ ] **SQL Injection Prevention**
  - Test with malicious SQL in presentation titles/content
  - **Expected:** Input sanitized, no database impact
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

- [ ] **XSS Prevention**
  - Test with script tags in presentation content
  - **Expected:** Scripts escaped/sanitized
  - **Result:** ☐ Pass ☐ Fail ☐ Notes: ________________

---

## Final Validation

### Sprint 2 Acceptance Criteria
- [ ] All presentation sync API endpoints functioning correctly
- [ ] Data synchronization maintains consistency across devices
- [ ] Performance requirements met (API <500ms, sync <2s)
- [ ] Error handling provides clear user feedback
- [ ] RLS enforcement prevents cross-user data access
- [ ] Rate limiting prevents API abuse
- [ ] Large presentations handled correctly
- [ ] Unicode and special characters preserved
- [ ] Concurrent operations handled gracefully

### Quality Gates Checklist
- [ ] **Test Coverage:** All API endpoints and error scenarios tested
- [ ] **Performance:** All operations meet specified time requirements
- [ ] **Security:** No authentication/authorization bypasses discovered
- [ ] **Data Integrity:** Zero data loss in round-trip testing
- [ ] **User Experience:** Clear error messages for all failure scenarios

---

## Test Results Summary

**Overall Status:** ☐ All Tests Pass ☐ Minor Issues ☐ Major Issues ☐ Blocking Issues

### Issues Discovered
| Issue # | Severity | Description | Steps to Reproduce | Expected | Actual |
|---------|----------|-------------|-------------------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Performance Metrics
| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Save API | <500ms | ___ms | ☐ Pass ☐ Fail |
| Get API | <500ms | ___ms | ☐ Pass ☐ Fail |
| List API | <500ms | ___ms | ☐ Pass ☐ Fail |
| End-to-End Sync | <2s | ___s | ☐ Pass ☐ Fail |

### Recommendations
- [ ] Ready for production deployment
- [ ] Requires minor fixes before deployment
- [ ] Requires major fixes before deployment
- [ ] Blocks Sprint 2 completion

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

**Tester Signature:** ________________ **Date:** ________________