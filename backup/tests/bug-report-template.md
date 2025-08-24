# Bug Report Template
## Sprint 2: Presentation Synchronization Issues

**Report ID:** BUG-SPRINT2-[DATE]-[NUMBER]  
**Date:** [YYYY-MM-DD]  
**Reporter:** [Name]  
**Assignee:** [Developer Name]  
**Status:** [ ] New [ ] In Progress [ ] Fixed [ ] Verified [ ] Closed  

---

## Bug Summary
**Title:** [Concise description of the issue]

**Component:** [ ] API Endpoints [ ] Extension UI [ ] Web Dashboard [ ] Database [ ] Authentication [ ] Performance

**Severity:** 
- [ ] **Critical** - System unusable, data loss, security vulnerability
- [ ] **High** - Major functionality broken, blocks user workflow
- [ ] **Medium** - Feature partially broken, workaround available
- [ ] **Low** - Minor issue, cosmetic, enhancement

**Priority:**
- [ ] **P0** - Fix immediately (production down)
- [ ] **P1** - Fix in current sprint
- [ ] **P2** - Fix in next sprint
- [ ] **P3** - Fix when time permits

---

## Environment Information

### System Details
- **Environment:** [ ] Local Development [ ] Staging [ ] Production
- **API Base URL:** [e.g., http://localhost:8888/.netlify/functions]
- **Database:** [ ] Local Supabase [ ] Remote Supabase
- **Extension Version:** [e.g., v0.0.26]
- **Browser:** [Chrome version, OS]
- **Network:** [ ] Local [ ] WiFi [ ] Cellular [ ] VPN

### Configuration
- **Authentication:** [ ] Working [ ] Failing [ ] Not tested
- **Device Token:** [ ] Valid [ ] Expired [ ] Missing
- **User ID:** [Test user identifier]
- **Device ID:** [Device identifier if relevant]

---

## Reproduction Steps

### Preconditions
[Any setup required before reproducing the issue]
- [ ] User authenticated in extension
- [ ] Specific test data loaded
- [ ] Services running (specify which)
- [ ] Other prerequisites

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]
4. [Continue with detailed steps...]

### Test Data Used
```json
{
  "presentationUrl": "https://gamma.app/docs/example",
  "title": "Test Presentation",
  "timetableData": {
    // Include actual test data that triggers the bug
  }
}
```

---

## Expected vs Actual Behavior

### Expected Behavior
[Detailed description of what should happen]

### Actual Behavior
[Detailed description of what actually happens]

### Screenshots/Videos
[Attach screenshots, screen recordings, or describe visual issues]

---

## Technical Details

### API Request/Response
**Endpoint:** [e.g., POST /api/presentations/save]

**Request:**
```json
{
  "method": "POST",
  "headers": {
    "Authorization": "Bearer [token]",
    "Content-Type": "application/json"
  },
  "body": {
    // Include actual request body
  }
}
```

**Response:**
```json
{
  "status": 500,
  "body": {
    "error": "server_error",
    "details": "specific error message"
  }
}
```

### Error Logs

#### Console Logs
```
[Timestamp] Error message from browser console
[Timestamp] Additional error details
```

#### Network Tab
```
Request URL: [full URL]
Status Code: [HTTP status]
Response Headers: [relevant headers]
Timing: [response time]
```

#### Server Logs
```
[Timestamp] Server error message
[Timestamp] Stack trace if available
```

### Database State
[If relevant, include database queries to show data state]
```sql
SELECT * FROM presentations WHERE gamma_url = 'test-url';
-- Result: [describe current state vs expected state]
```

---

## Impact Assessment

### User Impact
- **Affected Users:** [ ] All users [ ] Authenticated users only [ ] Specific user group
- **Frequency:** [ ] Always [ ] Often (>50%) [ ] Sometimes (10-50%) [ ] Rare (<10%)
- **Workaround Available:** [ ] Yes [ ] No
- **Workaround Description:** [If yes, describe the workaround]

### Business Impact
- [ ] Blocks Sprint 2 completion
- [ ] Prevents user authentication
- [ ] Causes data loss
- [ ] Degrades performance
- [ ] Creates security vulnerability
- [ ] Minor user experience issue

### Performance Impact
- **Response Time:** [Actual vs expected response time]
- **Resource Usage:** [CPU, memory, network usage if relevant]
- **Scalability:** [Does this affect system under load?]

---

## Additional Context

### Related Issues
- **Similar Bugs:** [Link to related bug reports]
- **Feature Requests:** [Link to related feature requests]
- **Documentation:** [Link to relevant documentation]

### Browser/Extension Context
- **Extension Storage:** [Relevant data from chrome.storage if applicable]
- **Authentication State:** [Current auth state when bug occurs]
- **Network Conditions:** [Slow, fast, intermittent connection]

### Code References
- **Suspected Files:** [List files that might contain the bug]
- **Recent Changes:** [Any recent code changes that might be related]
- **Code Snippets:** [Relevant code if identified]

---

## Investigation Notes

### Root Cause Analysis
[Space for developer to fill in during investigation]

### Hypothesis
[Initial theories about what might be causing the issue]

### Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests verified
- [ ] Manual testing completed
- [ ] Performance testing done

---

## Resolution

### Fix Description
[Detailed description of the implemented fix]

### Code Changes
- **Files Modified:** [List of files changed]
- **Pull Request:** [Link to PR]
- **Commit Hash:** [Git commit hash]

### Testing Verification
- [ ] Original reproduction steps no longer reproduce the issue
- [ ] Related functionality still works correctly
- [ ] Performance impact verified
- [ ] No regression in other areas

### Deployment Notes
- [ ] Database migrations required
- [ ] Configuration changes needed
- [ ] Documentation updates required
- [ ] User communication needed

---

## Quality Assurance

### Test Cases Added
- [ ] Unit test for specific bug scenario
- [ ] Integration test for workflow
- [ ] Performance test if relevant
- [ ] Manual test case documented

### Regression Testing
- [ ] All existing tests pass
- [ ] Core authentication flow verified
- [ ] API endpoints function correctly
- [ ] Cross-device sync working

### Sign-off
- [ ] **Developer:** Fix implemented and tested
- [ ] **QA Engineer:** Issue verified fixed
- [ ] **Product Owner:** Accepts resolution

---

## Follow-up Actions

### Immediate Actions
- [ ] Deploy fix to staging
- [ ] Verify fix in staging environment
- [ ] Update test suite
- [ ] Document lessons learned

### Long-term Actions
- [ ] Improve error handling
- [ ] Add monitoring/alerting
- [ ] Update documentation
- [ ] Code review process improvements

### Prevention Measures
- [ ] Additional validation added
- [ ] Better error messages implemented
- [ ] Monitoring enhanced
- [ ] Test coverage improved

---

## Labels/Tags
`bug` `sprint2` `api` `sync` `severity-[level]` `priority-[level]` `[component]`

---

## Comments/Updates

### [Date] - [Name]
[Update description, progress notes, or additional findings]

### [Date] - [Name]  
[Additional comments as the bug progresses through resolution]

---

**Template Usage Notes:**
- Fill in all relevant sections, mark N/A for non-applicable items
- Attach screenshots, logs, and test data as separate files
- Update status and comments as bug progresses
- Link to related issues, PRs, and documentation
- Use consistent formatting for easy reading and tracking