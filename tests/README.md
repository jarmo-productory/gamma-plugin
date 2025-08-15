# Sprint 2 Testing Suite - Execution Guide
## Presentation Synchronization Quality Assurance

This guide provides instructions for executing comprehensive tests for Sprint 2's manual presentation synchronization feature.

## 📋 Test Suite Overview

### Components Tested
- **API Endpoints**: `/api/presentations/save`, `/api/presentations/get`, `/api/presentations/list`
- **Authentication**: JWT token validation and refresh cycles
- **Data Integrity**: Round-trip fidelity and cross-device synchronization
- **Performance**: Response times and load handling
- **Error Handling**: Graceful failure scenarios and user feedback

### Test Coverage
- **95+ Test Scenarios**: Covering success paths, error conditions, edge cases
- **Authentication Security**: Token validation, expiration, cross-user isolation
- **Input Validation**: Malformed requests, injection prevention, data limits
- **Performance Benchmarks**: API response times, concurrent user handling
- **Integration Workflows**: End-to-end sync across devices

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure all services are running
npm install                    # Install dependencies
supabase start                # Start local database
npm run dev:web               # Start Netlify functions (port 3000)

# Verify environment
curl -s http://localhost:3000/.netlify/functions/protected-ping
# Expected: {"error":"missing_token"} (confirms API is running)
```

### Run All Tests
```bash
# Execute complete test suite
npm run test:sprint2

# Or run individual test suites
npm run test:api              # API endpoint tests
npm run test:performance      # Load testing with k6
npm run test:manual          # Manual testing checklist guidance
```

## 🧪 Test Execution Steps

### 1. Automated API Testing

#### Setup Environment Variables
```bash
# Required for test execution
export API_BASE_URL="http://localhost:3000/.netlify/functions"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export JWT_SECRET="test-secret-key-for-development-only"
```

#### Execute API Tests
```bash
# Run comprehensive API test suite
npm run test tests/api/presentations.test.js

# Run with coverage reporting
npm run test:coverage tests/api/presentations.test.js

# Run specific test groups
npm run test tests/api/presentations.test.js -t "POST /api/presentations/save"
npm run test tests/api/presentations.test.js -t "GET /api/presentations/get"
npm run test tests/api/presentations.test.js -t "GET /api/presentations/list"
```

#### Expected Results
- **All Tests Pass**: 95+ test scenarios should execute successfully
- **Performance**: API calls complete within 500ms under test load
- **Authentication**: Proper 401/403 responses for unauthorized requests
- **Data Integrity**: Round-trip data preservation verified

### 2. Performance Testing

#### Install K6 (if not already installed)
```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo apt update && sudo apt install k6

# Windows (via Chocolatey)
choco install k6
```

#### Execute Load Testing
```bash
# Basic load test (5-20 concurrent users, 14 minutes)
k6 run tests/performance/load-test.js

# Quick stress test (limited duration)
k6 run --duration 2m --vus 10 tests/performance/load-test.js

# Rate limiting validation
k6 run tests/performance/load-test.js --function rateLimitTest

# Large data handling test
k6 run tests/performance/load-test.js --function largeDataTest
```

#### Performance Benchmarks
- **API Response Time**: 95% of requests < 500ms
- **Error Rate**: < 5% under normal load
- **Rate Limiting**: Properly enforced (429 responses after limits)
- **Concurrent Users**: Handle 20+ simultaneous users

### 3. Manual Testing

#### Follow Manual Testing Checklist
```bash
# Open the detailed manual testing checklist
open tests/manual/sprint2-sync-checklist.md

# Or view in terminal
cat tests/manual/sprint2-sync-checklist.md
```

#### Key Manual Test Areas
1. **End-to-End Sync Workflow**: Extension → API → Database → Cross-device
2. **Authentication Integration**: Token refresh, expiration handling
3. **Conflict Resolution**: Local vs cloud data conflicts
4. **Error Scenarios**: Network failures, invalid data, server errors
5. **User Experience**: Loading states, error messages, performance

#### Manual Test Execution
1. Load extension in Chrome from `dist/` folder
2. Authenticate user and verify device token
3. Create test presentation in gamma.app
4. Execute sync operations (save/load)
5. Verify data consistency across devices
6. Test error scenarios and edge cases

## 📊 Test Results & Reporting

### Automated Test Results
```bash
# Generate test report
npm run test:report

# View coverage report
npm run test:coverage
open coverage/index.html
```

### Performance Test Results
- K6 automatically generates summary reports
- Check for threshold violations (response time, error rate)
- Verify rate limiting and concurrent user handling

### Manual Test Documentation
- Fill out checklist in `tests/manual/sprint2-sync-checklist.md`
- Document any bugs using `tests/bug-report-template.md`
- Include screenshots and detailed reproduction steps

## 🐛 Bug Reporting

### When Tests Fail
1. **Capture Evidence**: Screenshots, logs, network traces
2. **Document Details**: Use the standardized bug report template
3. **Categorize Severity**: Critical, High, Medium, Low
4. **Provide Reproduction**: Clear steps to reproduce the issue

### Bug Report Template
```bash
# Copy template for new bug report
cp tests/bug-report-template.md bugs/BUG-SPRINT2-$(date +%Y%m%d)-001.md

# Fill in all relevant sections
# Attach evidence files (screenshots, logs)
# Assign to Full-Stack Engineer for resolution
```

## 🔍 Quality Gates

### Acceptance Criteria Validation
Before Sprint 2 completion, verify:

- [ ] **API Endpoints**: All return correct HTTP status codes
- [ ] **Authentication**: Proper JWT validation and refresh cycles
- [ ] **Data Integrity**: No data loss in round-trip testing
- [ ] **Performance**: All operations meet time requirements
- [ ] **Error Handling**: Clear user feedback for all failure scenarios
- [ ] **Security**: RLS enforcement prevents cross-user access
- [ ] **Rate Limiting**: Properly protects against abuse

### Performance Requirements
- **API Response Time**: < 500ms for 95% of requests
- **Sync Operation**: < 2 seconds end-to-end
- **Large Presentations**: Handle 100+ slides efficiently
- **Concurrent Users**: Support 20+ simultaneous users

### Security Validation
- **Authentication**: No bypass of JWT token validation
- **Authorization**: Users cannot access other users' data
- **Input Validation**: All malicious input properly sanitized
- **Rate Limiting**: Abuse prevention mechanisms working

## 📈 Continuous Quality Monitoring

### Ongoing Quality Assurance
- **Daily Test Runs**: Execute automated tests with each code change
- **Performance Monitoring**: Track API response times over time
- **Error Rate Tracking**: Monitor and alert on elevated error rates
- **User Experience**: Regular validation of sync workflows

### Quality Metrics Dashboard
- **Test Coverage**: Maintain >80% coverage for new code
- **Performance Trends**: Track response time improvements/degradations
- **Bug Density**: Monitor bugs per feature/sprint
- **User Satisfaction**: Collect feedback on sync reliability

## 🛠️ Troubleshooting

### Common Issues

#### Tests Failing to Connect to API
```bash
# Verify Netlify dev is running
curl http://localhost:3000/.netlify/functions/protected-ping
# Should return: {"error":"missing_token"}

# Check Supabase connection
npm run test:db-connection
```

#### Authentication Test Failures
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check test user creation
npm run test:setup-users
```

#### Performance Test Issues
```bash
# Verify k6 installation
k6 version

# Test with reduced load
k6 run --duration 30s --vus 2 tests/performance/load-test.js
```

### Getting Help
- **Documentation**: Check `CLAUDE.md` for project architecture
- **Issues**: Create bug reports using the template
- **Team Communication**: Tag QA Engineer in relevant discussions

---

## 📚 Additional Resources

- **Project Architecture**: `/CLAUDE.md`
- **Sprint 2 Strategy**: `/test-strategy-sprint2.md`
- **API Documentation**: Review endpoint implementations in `/netlify/functions/`
- **Database Schema**: `/supabase/migrations/`
- **Quality Standards**: `/agents/qa-engineer-memory.md`

---

**Quality Assurance Contact**: Claude Code (QA Engineer)  
**Last Updated**: 2025-08-13  
**Sprint**: 2 - Manual Presentation Synchronization