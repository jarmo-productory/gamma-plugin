# Sprint 2 Testing Strategy: Manual Presentation Synchronization

**QA Engineer:** Claude Code  
**Date:** 2025-08-13  
**Sprint 2 Focus:** Manual presentation data synchronization via API endpoints  

## Executive Summary

This comprehensive testing strategy ensures the quality, reliability, and performance of Sprint 2's manual presentation synchronization feature. The strategy covers three new API endpoints (`/api/presentations/save`, `/api/presentations/get`, `/api/presentations/list`) and their integration with the extension and web dashboard.

## 1. API Endpoint Testing

### 1.1 POST /api/presentations/save

#### Success Scenarios
- **Valid Save Request**: Complete timetable data with proper authentication
  ```json
  POST /api/presentations/save
  Authorization: Bearer <valid_device_token>
  {
    "presentationUrl": "https://gamma.app/docs/test-presentation-123",
    "title": "Test Presentation",
    "timetableData": {
      "title": "Test Presentation",
      "items": [
        {
          "id": "slide-1",
          "title": "Introduction",
          "content": "Welcome to the presentation",
          "duration": 5,
          "startTime": "09:00",
          "endTime": "09:05"
        }
      ],
      "lastModified": "2025-08-13T10:00:00Z"
    }
  }
  ```
  - **Expected**: 200 OK with presentation metadata
  - **Validation**: Database record created with correct user association
  - **Performance**: Response time < 500ms

- **Upsert Functionality**: Update existing presentation with same URL
  - **Expected**: 200 OK with updated data
  - **Validation**: Database record updated, not duplicated
  - **Performance**: Response time < 500ms

#### Error Scenarios
- **Missing Authentication**: No Bearer token
  - **Expected**: 401 Unauthorized, error: "missing_token"

- **Invalid Token**: Expired or malformed JWT
  - **Expected**: 401 Unauthorized, error: "expired" or "bad_signature"

- **Invalid JSON**: Malformed request body
  - **Expected**: 400 Bad Request, error: "invalid_json"

- **Missing Required Fields**: No presentationUrl, title, or timetableData
  - **Expected**: 400 Bad Request, error: "invalid_presentation_url"

- **Invalid Timetable Structure**: Missing items array or invalid item format
  - **Expected**: 400 Bad Request, error: "invalid_timetable_items"

- **Rate Limiting**: More than 10 saves per minute from same IP
  - **Expected**: 429 Too Many Requests, error: "rate_limited"

- **User Not Found**: Valid token but user doesn't exist in database
  - **Expected**: 404 Not Found, error: "user_not_found"

- **Database Error**: Supabase connection or constraint violations
  - **Expected**: 500 Internal Server Error, error: "save_failed"

#### Edge Cases
- **Large Timetable Data**: 100+ slides with complex content
- **Special Characters**: URLs and titles with Unicode characters
- **Concurrent Saves**: Multiple saves for same presentation URL
- **Network Timeouts**: Slow database operations

### 1.2 GET /api/presentations/get

#### Success Scenarios
- **Valid Get Request**: Retrieve existing presentation
  ```bash
  GET /api/presentations/get?url=https://gamma.app/docs/test-presentation-123
  Authorization: Bearer <valid_device_token>
  ```
  - **Expected**: 200 OK with complete presentation data
  - **Validation**: Correct timetableData structure returned
  - **Performance**: Response time < 500ms

#### Error Scenarios
- **Missing Authentication**: Same as save endpoint
- **Invalid Token**: Same as save endpoint
- **Missing URL Parameter**: No ?url= in query string
  - **Expected**: 400 Bad Request, error: "missing_presentation_url"

- **Presentation Not Found**: Valid user but presentation doesn't exist
  - **Expected**: 404 Not Found, error: "presentation_not_found"

- **Access Denied**: Presentation belongs to different user (RLS test)
  - **Expected**: 404 Not Found (RLS should hide other users' data)

- **Rate Limiting**: More than 30 gets per minute from same IP
  - **Expected**: 429 Too Many Requests, error: "rate_limited"

#### Edge Cases
- **URL Encoding**: Special characters in presentation URL
- **Case Sensitivity**: URL variations (https vs http, www vs non-www)

### 1.3 GET /api/presentations/list

#### Success Scenarios
- **Basic List Request**: Get user's presentations
  ```bash
  GET /api/presentations/list
  Authorization: Bearer <valid_device_token>
  ```
  - **Expected**: 200 OK with presentations array and pagination metadata
  - **Validation**: Only user's presentations returned (RLS enforcement)
  - **Performance**: Response time < 500ms

- **Pagination**: Custom limit and offset
  ```bash
  GET /api/presentations/list?limit=10&offset=20
  ```
  - **Expected**: Correct subset of presentations returned
  - **Validation**: Pagination metadata accurate

- **Sorting**: Custom sort order
  ```bash
  GET /api/presentations/list?sortBy=title&sortOrder=asc
  ```
  - **Expected**: Presentations sorted correctly
  - **Validation**: Sort field validation (only allowed fields)

#### Error Scenarios
- **Missing Authentication**: Same as other endpoints
- **Invalid Token**: Same as other endpoints
- **Invalid Sort Field**: Unallowed sortBy parameter
  - **Expected**: Falls back to "updated_at" default
- **Rate Limiting**: More than 20 lists per minute from same IP
  - **Expected**: 429 Too Many Requests, error: "rate_limited"

#### Edge Cases
- **Empty Results**: User with no presentations
- **Large Result Sets**: Users with 100+ presentations
- **Pagination Boundaries**: Last page with partial results

## 2. Integration Testing

### 2.1 End-to-End Sync Flow Testing

#### Complete Sync Workflow
1. **Extension Setup**: Load extension with authenticated user
2. **Create Timetable**: Extract slides from gamma.app presentation
3. **Manual Save**: User clicks "Save to Cloud" button
4. **API Call**: Extension calls `/api/presentations/save`
5. **Database Storage**: Data persisted in Supabase
6. **Cross-device Access**: Load same presentation on different device
7. **Manual Load**: User clicks "Load from Cloud" button
8. **API Call**: Extension calls `/api/presentations/get`
9. **Timetable Restoration**: Local timetable updated with cloud data

#### Authentication Integration
- **Token Refresh**: Test sync during token refresh cycle
- **Auth Expiration**: Handle expired tokens gracefully
- **Network Failures**: Retry logic for failed API calls

#### Conflict Resolution Testing
- **Local vs Cloud**: Different timetable data for same presentation URL
- **Timestamp Comparison**: lastModified timestamp-based resolution
- **User Choice**: Manual conflict resolution UI workflow

### 2.2 Cross-Device Synchronization

#### Multi-Device Scenarios
- **Device A Save → Device B Load**: Basic sync validation
- **Concurrent Edits**: Multiple devices editing same presentation
- **Offline/Online Transitions**: Sync when connection restored

#### Data Consistency
- **Round-trip Fidelity**: Save → Load → Verify data integrity
- **Unicode Support**: Special characters in titles and content
- **Large Data Sets**: Presentations with 50+ slides

## 3. Performance Testing

### 3.1 API Response Time Requirements

#### Success Criteria
- **Save Operation**: < 500ms for typical presentation (10-20 slides)
- **Get Operation**: < 500ms for any presentation size
- **List Operation**: < 500ms for up to 100 presentations
- **Sync Operation**: < 2 seconds end-to-end including UI updates

#### Load Testing Scenarios
- **Concurrent Users**: 10 users saving presentations simultaneously
- **Large Presentations**: 100+ slides with rich content
- **High Frequency**: Rapid save/load cycles
- **Rate Limit Testing**: Verify 429 responses under load

### 3.2 Database Performance

#### Query Optimization
- **Index Usage**: Verify queries use proper indexes
- **RLS Performance**: Row-level security overhead measurement
- **JSONB Operations**: Timetable data query performance

#### Stress Testing
- **Large Users**: 1000+ users with 50+ presentations each
- **Complex Queries**: Pagination with sorting on large datasets
- **Concurrent Access**: Multiple devices accessing same user data

## 4. Manual Testing Procedures

### 4.1 Extension UI Testing (Future Implementation)

#### Save to Cloud Workflow
1. Open gamma.app presentation
2. Generate timetable in extension
3. Verify "Save to Cloud" button appears (authenticated users only)
4. Click "Save to Cloud"
5. Verify success message/indicator
6. Check network tab for API call
7. Validate response data

#### Load from Cloud Workflow
1. Open gamma.app presentation (existing or new device)
2. Verify "Load from Cloud" button appears (authenticated users only)
3. Click "Load from Cloud"
4. Verify timetable loads with cloud data
5. Check for conflict resolution prompts if needed
6. Validate loaded data accuracy

#### Error Handling
- **Network Failure**: Graceful error messages
- **API Errors**: User-friendly error presentation
- **Token Expiration**: Automatic token refresh or re-auth prompt

### 4.2 Web Dashboard Testing (Future Implementation)

#### Presentation Management
1. Navigate to dashboard presentations list
2. Verify all user presentations displayed
3. Test pagination and sorting controls
4. Click individual presentation to view details
5. Verify timetable data display
6. Test edit/delete operations

#### Sync Status Indicators
- **Sync Timestamps**: Show last sync time
- **Conflict Indicators**: Highlight conflicted presentations
- **Error States**: Show sync failures clearly

## 5. Data Integrity Testing

### 5.1 Persistence Validation

#### Database Record Verification
- **Complete Data Storage**: All timetable fields preserved
- **User Association**: Correct user_id relationships
- **Timestamp Accuracy**: created_at and updated_at fields
- **JSONB Structure**: Proper timetableData format

#### RLS Enforcement
- **User Isolation**: Users can't access other users' data
- **Service Role Access**: Backend functions can access all data
- **Policy Testing**: Verify all CRUD operations respect RLS

### 5.2 Data Transformation Testing

#### Round-trip Accuracy
- **Input → API → Database → API → Output**: Verify no data loss
- **Type Preservation**: Numbers, strings, arrays maintain types
- **Special Characters**: Unicode and HTML entities preserved
- **Nested Objects**: Complex timetable structures intact

#### Edge Cases
- **Empty Data**: Presentations with no slides
- **Maximum Limits**: Very large timetable objects
- **Malformed Data**: Graceful handling of invalid input

## 6. Security Testing

### 6.1 Authentication Validation

#### Token Security
- **JWT Signature Verification**: Invalid signatures rejected
- **Token Expiration**: Expired tokens properly rejected
- **Malformed Tokens**: Graceful handling of invalid formats

#### Authorization Testing
- **Cross-user Access**: Verify users can't access others' data
- **Device Token Scope**: Ensure tokens only access authorized resources
- **Rate Limiting**: Prevent abuse with proper limits

### 6.2 Input Validation

#### Injection Prevention
- **SQL Injection**: Parameterized queries protect database
- **XSS Prevention**: User input properly escaped
- **JSON Injection**: Invalid JSON structures rejected

#### Data Sanitization
- **URL Validation**: Presentation URLs properly validated
- **Content Filtering**: No malicious content stored
- **Size Limits**: Prevent excessive data uploads

## 7. Bug Report Template

### Bug Report Format
```markdown
## Bug Report: [Short Description]

### Environment
- **Endpoint**: /api/presentations/[save|get|list]
- **User Agent**: Chrome Extension v0.0.26
- **Network**: [Local Development|Production]
- **Database**: Supabase [Local|Remote]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### API Request/Response
```json
// Request
{...}

// Response
{...}
```

### Error Logs
```
[Console logs, network errors, etc.]
```

### Impact
- **Severity**: [Critical|High|Medium|Low]
- **User Impact**: [Blocks workflow|Degrades experience|Minor inconvenience]
- **Frequency**: [Always|Often|Sometimes|Rare]

### Additional Context
[Screenshots, related issues, workarounds]
```

## 8. Test Environment Setup

### 8.1 Local Development
```bash
# Required services
supabase start
netlify dev

# Test data setup
npm run test:setup-data

# Run automated tests
npm run test:api
npm run test:integration
```

### 8.2 Test Database
- **Isolated Test Schema**: Separate from development data
- **Test User Accounts**: Pre-configured test users
- **Sample Data**: Variety of presentations for testing

### 8.3 Automated Testing Tools
- **API Testing**: Supertest with custom test suite
- **Load Testing**: k6 scripts for performance validation
- **Integration Testing**: Playwright for end-to-end workflows

## 9. Success Criteria

### 9.1 Sprint 2 Acceptance Criteria
- [ ] All API endpoints return correct responses (200/400/401/404/429/500)
- [ ] Data synchronization maintains consistency across devices
- [ ] Performance requirements met (API < 500ms, sync < 2s)
- [ ] Error handling provides clear user feedback
- [ ] RLS enforcement prevents cross-user data access
- [ ] Rate limiting prevents abuse
- [ ] Large presentations (50+ slides) handled correctly
- [ ] Unicode and special characters preserved
- [ ] Concurrent operations handled gracefully

### 9.2 Quality Gates
- **Test Coverage**: 100% of API endpoints and error scenarios
- **Performance**: All API calls under 500ms in load testing
- **Security**: No authentication or authorization bypasses
- **Data Integrity**: Zero data loss in round-trip testing
- **User Experience**: Clear error messages for all failure scenarios

## 10. Test Execution Timeline

### Phase 1: API Unit Testing (Day 1)
- Implement automated tests for all three endpoints
- Cover all success and error scenarios
- Validate rate limiting and authentication

### Phase 2: Integration Testing (Day 2)
- End-to-end sync workflow validation
- Cross-device synchronization testing
- Database integrity verification

### Phase 3: Performance Testing (Day 3)
- Load testing with concurrent users
- Large dataset performance validation
- API response time measurement

### Phase 4: Manual Testing (Day 4)
- Extension UI integration (when implemented)
- Error scenario validation
- User experience evaluation

### Phase 5: Security & Edge Cases (Day 5)
- Authentication and authorization testing
- Input validation and injection prevention
- Edge case and boundary testing

## Next Steps

1. **Implement Automated Test Suite**: Create comprehensive API tests using Supertest
2. **Set Up Test Environment**: Configure isolated test database and sample data
3. **Execute Test Plan**: Run through all test scenarios systematically
4. **Document Findings**: Record all bugs and quality issues discovered
5. **Validate Fixes**: Re-test after Full-Stack Engineer addresses issues
6. **Performance Benchmarking**: Establish baseline metrics for future comparison

This testing strategy ensures comprehensive validation of Sprint 2's presentation synchronization feature while maintaining the high quality standards established in Sprint 1.