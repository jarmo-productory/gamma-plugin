# Simulator Testing Guide

Complete guide for testing the Gamma extension authentication and save flows using the simulator.

## Prerequisites

1. **API Server Running**:
   ```bash
   cd packages/web
   npm run dev
   # Server should be running at http://localhost:3000
   ```

2. **Simulator Installed**:
   ```bash
   cd packages/web/simulator
   npm install
   ```

## Test Scenarios

### Scenario 1: Complete Auth Flow (Happy Path)

**Step 1: Register Device**
```bash
cd packages/web/simulator
npm run register
```

**Expected Output:**
```
🔐 Registering device...
API URL: http://localhost:3000/api/devices/register
Device Fingerprint: <hash>
Response Status: 200
Response Body: {"deviceId":"<uuid>","code":"ABC123","expiresAt":"..."}

✅ Device registered successfully!

📋 Pairing Instructions:
1. Open this URL in your browser:
   http://localhost:3000/?source=extension&code=ABC123

2. Sign in with your Gamma account

3. Run: simulator pair

Device Code: ABC123
Expires: <timestamp>
```

**Step 2: Pair Device in Browser**
1. Copy the pairing URL from output
2. Open in browser
3. Sign in with Gamma account
4. Approve device pairing

**Step 3: Exchange Code for Token**
```bash
npm run pair
```

**Expected Output:**
```
🔗 Device Pairing Flow
==================================================
Device ID: <uuid>
Code: ABC123

⏳ Polling for device pairing...
Will check every 2000ms for up to 300s

🔄 Attempting token exchange...
Response Status: 200
Response Body: {"token":"<jwt>","expiresAt":"..."}
✅ Token received and saved!

🎉 Device paired successfully!
Token expires: <timestamp>
```

**Step 4: Save Presentation**
```bash
npm run save
```

**Expected Output:**
```
💾 Presentation Save Flow
==================================================

💾 Saving presentation...
URL: https://gamma.app/docs/mock-presentation-<timestamp>
Title: TypeScript Workshop
Slides: 8
Total Duration: 80 minutes

📤 Request payload:
{
  "gamma_url": "https://gamma.app/docs/mock-presentation-<timestamp>",
  "title": "TypeScript Workshop",
  "start_time": "09:00",
  "total_duration": 80,
  "timetable_data": {
    "title": "TypeScript Workshop",
    "items": [
      { "id": "slide-1", "title": "Introduction to TypeScript", "duration": 5 },
      ...
    ]
  }
}

📥 Response Status: 200
Response Body: {"id":"<uuid>","message":"Presentation saved successfully"}

✅ Presentation saved successfully!
```

**Step 5: Check Status**
```bash
npm run status
```

**Expected Output:**
```
📊 Simulator Status:
==================================================
Device ID: <uuid>
Device Code: ABC123
Code Expires: <timestamp>
Code Valid: ✅ Yes

Token: ✅ Valid
Token Expires: <timestamp>
Token Preview: eyJhbGciOiJIUzI1NiIs...
==================================================
```

### Scenario 2: Token Refresh

**Setup:** Wait for token to expire or manually edit token expiry

**Test:**
```bash
npm run save
```

**Expected Output:**
```
🔄 Refreshing token...
API URL: http://localhost:3000/api/devices/refresh
Response Status: 200
Response Body: {"token":"<new_jwt>","expiresAt":"..."}
✅ Token refreshed!

💾 Saving presentation...
...
```

### Scenario 3: Device Not Paired (Polling)

**Step 1: Register Device**
```bash
npm run register
```

**Step 2: Pair WITHOUT Opening Browser**
```bash
npm run pair
```

**Expected Output:**
```
🔗 Device Pairing Flow
==================================================

⏳ Polling for device pairing...
Will check every 2000ms for up to 300s

🔄 Attempting token exchange...
Response Status: 404
Response Body: {"error":"Device not linked"}
⏳ Device not linked yet...

🔄 Attempting token exchange...
Response Status: 404
Response Body: {"error":"Device not linked"}
⏳ Device not linked yet...

... (continues until timeout or you pair in browser)
```

### Scenario 4: Invalid Token (401)

**Setup:** Manually corrupt token or delete from Supabase

**Test:**
```bash
npm run save
```

**Expected Output:**
```
❌ Not authenticated. Run: simulator pair
```

### Scenario 5: Save with Retry Logic

**Setup:** Simulate API failure (stop server, then restart)

**Test:**
```bash
npm run save
```

**Expected Output:**
```
🔄 Save attempt 1/3...
❌ Attempt 1 failed: TypeError: fetch failed
⏳ Retrying in 1234ms...

🔄 Save attempt 2/3...
❌ Attempt 2 failed: TypeError: fetch failed
⏳ Retrying in 3456ms...

🔄 Save attempt 3/3...
✅ Presentation saved successfully!
```

### Scenario 6: Custom Presentation URL

**Test:**
```bash
npm run save -- --url "https://gamma.app/docs/my-custom-presentation"
```

**Expected Output:**
```
💾 Saving presentation...
URL: https://gamma.app/docs/my-custom-presentation
...
```

### Scenario 7: Clear All Data

**Test:**
```bash
npm run clear
npm run status
```

**Expected Output:**
```
🗑️  Clearing all data...
✅ All data cleared!

📊 Simulator Status:
==================================================
Device: ❌ Not registered

Token: ❌ Not authenticated
==================================================
```

## Debugging

### Enable Verbose Logging

Edit `src/index.ts` and add:
```typescript
process.env.DEBUG = 'true';
```

### Inspect Storage Files

```bash
cd .simulator-storage
cat device_info_v1.json
cat device_token_v1.json
cat install_id_v1.json
```

### Compare with Extension

1. **Export HAR from browser extension**:
   - Open DevTools → Network tab
   - Perform auth flow in extension
   - Right-click → Save all as HAR

2. **Compare request headers**:
   ```bash
   # Simulator logs exact headers
   npm run save

   # Compare with HAR:
   # - Authorization header format
   # - Content-Type
   # - Request body structure
   ```

### Common Issues

**Issue:** "Device registration failed: 500"
- Check API server is running
- Check database connection
- Review API logs

**Issue:** "Token exchange timeout"
- Make sure you opened pairing URL
- Check browser console for errors
- Verify code hasn't expired

**Issue:** "Save failed: 401"
- Token expired or invalid
- Run `npm run status` to check
- Re-pair: `npm run pair`

**Issue:** "Save failed: 500"
- Check API server logs
- Verify request payload format
- Check database schema

## API Endpoint Verification

### Registration Endpoint
```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{"device_fingerprint":"test123"}'
```

### Exchange Endpoint
```bash
curl -X POST http://localhost:3000/api/devices/exchange \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"<uuid>","code":"ABC123"}'
```

### Refresh Endpoint
```bash
curl -X POST http://localhost:3000/api/devices/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{}'
```

### Save Endpoint
```bash
curl -X POST http://localhost:3000/api/presentations/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "gamma_url": "https://gamma.app/docs/test",
    "title": "Test",
    "timetable_data": {
      "title": "Test",
      "items": [
        {"id":"1","title":"Slide 1","duration":5}
      ]
    }
  }'
```

## Performance Testing

### Measure Registration Time
```bash
time npm run register
```

### Measure Pairing Time
```bash
time npm run pair
```

### Measure Save Time
```bash
time npm run save
```

### Stress Test (Multiple Saves)
```bash
for i in {1..10}; do
  npm run save -- --url "https://gamma.app/docs/test-$i"
  sleep 1
done
```

## Integration Testing

Create a test script:

```bash
#!/bin/bash
# test-flow.sh

echo "🧪 Testing complete flow..."

# 1. Clear existing data
npm run clear

# 2. Register device
npm run register
if [ $? -ne 0 ]; then
  echo "❌ Registration failed"
  exit 1
fi

# 3. Manual step: pair in browser
echo "⏸️  Please pair device in browser, then press Enter"
read

# 4. Exchange token
npm run pair
if [ $? -ne 0 ]; then
  echo "❌ Pairing failed"
  exit 1
fi

# 5. Save presentation
npm run save
if [ $? -ne 0 ]; then
  echo "❌ Save failed"
  exit 1
fi

# 6. Check status
npm run status

echo "✅ All tests passed!"
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Test Simulator

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd packages/web
          npm install
          cd simulator
          npm install

      - name: Build TypeScript
        run: |
          cd packages/web/simulator
          npm run build

      - name: Test CLI help
        run: |
          cd packages/web/simulator
          npm run dev
```

## Next Steps

1. **Add automated tests**: Create Jest tests for auth and save logic
2. **Mock API responses**: Use MSW for offline testing
3. **Add Docker setup**: Containerize simulator for consistent testing
4. **Create test fixtures**: Generate various presentation payloads
5. **Performance benchmarks**: Track auth and save timings
