# Comparing Simulator with Browser Extension

This guide helps you verify that the simulator makes identical API calls to the browser extension.

## Setup

### 1. Export Extension HAR File

1. Open browser with Gamma extension installed
2. Open DevTools (F12)
3. Go to Network tab
4. Click "Preserve log"
5. Perform auth flow in extension:
   - Register device
   - Pair device
   - Save presentation
6. Right-click in Network tab → "Save all as HAR with content"
7. Save as `extension-flow.har`

### 2. Run Simulator with Logging

```bash
cd packages/web/simulator
npm run register > simulator-register.log 2>&1
npm run pair > simulator-pair.log 2>&1
npm run save > simulator-save.log 2>&1
```

## Comparison Checklist

### Device Registration

**Extension HAR:**
```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/devices/register",
  "headers": [
    {"name": "Content-Type", "value": "application/json"}
  ],
  "postData": {
    "text": "{\"device_fingerprint\":\"<hash>\"}"
  }
}
```

**Simulator Log:**
```
API URL: http://localhost:3000/api/devices/register
Request Headers: Content-Type: application/json
Request Body: {"device_fingerprint":"<hash>"}
```

**✅ Verify:**
- [ ] Same endpoint URL
- [ ] Same HTTP method (POST)
- [ ] Same Content-Type header
- [ ] device_fingerprint in request body
- [ ] Response has deviceId, code, expiresAt

### Token Exchange

**Extension HAR:**
```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/devices/exchange",
  "headers": [
    {"name": "Content-Type", "value": "application/json"}
  ],
  "postData": {
    "text": "{\"deviceId\":\"<uuid>\",\"code\":\"<code>\"}"
  }
}
```

**Simulator Log:**
```
API URL: http://localhost:3000/api/devices/exchange
Request Body: {"deviceId":"<uuid>","code":"<code>"}
```

**✅ Verify:**
- [ ] Same endpoint URL
- [ ] Same HTTP method (POST)
- [ ] deviceId and code in request body
- [ ] Response has token and expiresAt
- [ ] Handles 404 (not linked) correctly
- [ ] Polling interval matches (2000ms simulator vs 2500ms extension)

### Token Refresh

**Extension HAR:**
```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/devices/refresh",
  "headers": [
    {"name": "Content-Type", "value": "application/json"},
    {"name": "Authorization", "value": "Bearer <token>"}
  ],
  "postData": {
    "text": "{}"
  }
}
```

**Simulator Log:**
```
API URL: http://localhost:3000/api/devices/refresh
Request Headers: Authorization: Bearer <token>
```

**✅ Verify:**
- [ ] Same endpoint URL
- [ ] Same HTTP method (POST)
- [ ] Authorization header format exact match
- [ ] Empty request body
- [ ] Response has new token and expiresAt

### Presentation Save

**Extension HAR:**
```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/presentations/save",
  "headers": [
    {"name": "Content-Type", "value": "application/json"},
    {"name": "Authorization", "value": "Bearer <token>"}
  ],
  "postData": {
    "text": "{\"gamma_url\":\"...\",\"title\":\"...\",\"timetable_data\":{...}}"
  }
}
```

**Simulator Log:**
```
API URL: http://localhost:3000/api/presentations/save
Request Headers: Authorization: Bearer <token>
Request Body: {
  "gamma_url": "...",
  "title": "...",
  "start_time": "...",
  "total_duration": ...,
  "timetable_data": {...}
}
```

**✅ Verify:**
- [ ] Same endpoint URL
- [ ] Same HTTP method (POST)
- [ ] Authorization header format
- [ ] gamma_url field (snake_case)
- [ ] title field
- [ ] start_time field (snake_case)
- [ ] total_duration field (snake_case)
- [ ] timetable_data object structure:
  - [ ] title (string)
  - [ ] items (array)
  - [ ] Each item has: id, title, duration
  - [ ] duration is number, not string
  - [ ] startTime and endTime optional

## Detailed Field Comparison

### Request Headers

| Header | Extension | Simulator | Match? |
|--------|-----------|-----------|--------|
| Content-Type | application/json | application/json | ✅ |
| Authorization | Bearer \<token> | Bearer \<token> | ✅ |

### Registration Request

| Field | Extension | Simulator | Match? |
|-------|-----------|-----------|--------|
| device_fingerprint | SHA-256 hash | SHA-256 hash | ✅ |

### Exchange Request

| Field | Extension | Simulator | Match? |
|-------|-----------|-----------|--------|
| deviceId | UUID | UUID | ✅ |
| code | 6-char code | 6-char code | ✅ |

### Save Request

| Field | Extension | Simulator | Match? |
|-------|-----------|-----------|--------|
| gamma_url | https://gamma.app/... | https://gamma.app/... | ✅ |
| title | String | String | ✅ |
| start_time | "HH:MM" | "HH:MM" | ✅ |
| total_duration | Number | Number | ✅ |
| timetable_data.items | Array | Array | ✅ |
| items[].id | String | String | ✅ |
| items[].title | String | String | ✅ |
| items[].duration | Number | Number | ✅ |

## Response Comparison

### Registration Response

```json
{
  "deviceId": "<uuid>",
  "code": "<6-char>",
  "expiresAt": "<ISO-8601>"
}
```

**✅ Verify:**
- [ ] deviceId is valid UUID
- [ ] code is 6 characters
- [ ] expiresAt is valid ISO-8601 timestamp
- [ ] expiresAt is in future

### Exchange Response (Success)

```json
{
  "token": "<jwt>",
  "expiresAt": "<ISO-8601>"
}
```

**✅ Verify:**
- [ ] token is JWT format (3 parts, base64)
- [ ] expiresAt is valid ISO-8601
- [ ] expiresAt is in future

### Exchange Response (Not Linked)

```json
{
  "error": "Device not linked"
}
```

**Status Code:** 404

### Save Response (Success)

```json
{
  "id": "<uuid>",
  "message": "Presentation saved successfully"
}
```

**✅ Verify:**
- [ ] id is valid UUID
- [ ] message is present

## Error Handling Comparison

| Scenario | Extension Behavior | Simulator Behavior | Match? |
|----------|-------------------|-------------------|--------|
| 404 on exchange | Continue polling | Continue polling | ✅ |
| 401 on save | Clear token, re-auth | Throw error | ⚠️ |
| 500 on save | Retry 3x | Retry 3x | ✅ |
| Network error | Retry with backoff | Retry with backoff | ✅ |

## Automated Comparison Script

```bash
#!/bin/bash
# compare-flows.sh

echo "🔍 Comparing Extension vs Simulator Flows"
echo "=========================================="

# Extract from HAR
EXTENSION_REGISTER=$(cat extension-flow.har | jq '.log.entries[] | select(.request.url | contains("/register"))')
EXTENSION_EXCHANGE=$(cat extension-flow.har | jq '.log.entries[] | select(.request.url | contains("/exchange"))')
EXTENSION_SAVE=$(cat extension-flow.har | jq '.log.entries[] | select(.request.url | contains("/save"))')

# Compare registration
echo "📝 Registration Endpoint:"
echo "  Extension URL: $(echo $EXTENSION_REGISTER | jq -r '.request.url')"
echo "  Simulator URL: http://localhost:3000/api/devices/register"
echo ""

# Compare exchange
echo "🔄 Exchange Endpoint:"
echo "  Extension URL: $(echo $EXTENSION_EXCHANGE | jq -r '.request.url')"
echo "  Simulator URL: http://localhost:3000/api/devices/exchange"
echo ""

# Compare save
echo "💾 Save Endpoint:"
echo "  Extension URL: $(echo $EXTENSION_SAVE | jq -r '.request.url')"
echo "  Simulator URL: http://localhost:3000/api/presentations/save"
echo ""

# Compare request bodies
echo "📊 Request Body Comparison:"
echo "  Extension gamma_url: $(echo $EXTENSION_SAVE | jq -r '.request.postData.text' | jq -r '.gamma_url')"
echo "  Extension uses snake_case: $(echo $EXTENSION_SAVE | jq -r '.request.postData.text' | grep -c 'gamma_url')"
echo "  Simulator uses snake_case: ✅"
```

## Troubleshooting Differences

### Issue: Different URL Format

**Extension:** Uses full URL with protocol
**Simulator:** Uses relative path

**Fix:** Update simulator to use full URL if needed

### Issue: Different Header Casing

**Extension:** `Authorization: Bearer ...`
**Simulator:** `authorization: bearer ...`

**Fix:** Ensure exact case match

### Issue: Different Payload Structure

**Extension:** Sends extra fields
**Simulator:** Missing fields

**Fix:** Update payload to match exactly

### Issue: Different Error Handling

**Extension:** Retries silently
**Simulator:** Logs verbosely

**Fix:** This is acceptable for debugging

## Final Verification

Run both flows simultaneously and compare database entries:

```sql
-- Check device_tokens table
SELECT
  device_id,
  created_at,
  expires_at
FROM device_tokens
WHERE device_id IN (
  '<extension-device-id>',
  '<simulator-device-id>'
)
ORDER BY created_at DESC;

-- Check presentations table
SELECT
  id,
  user_id,
  gamma_url,
  title,
  created_at
FROM presentations
WHERE gamma_url LIKE '%simulator%'
   OR gamma_url LIKE '%extension%'
ORDER BY created_at DESC;
```

**✅ Database verification:**
- [ ] Both devices create valid tokens
- [ ] Both presentations have same structure
- [ ] Timestamps are reasonable
- [ ] Foreign key relationships intact

## Conclusion

If all checkboxes are ✅, the simulator accurately replicates the extension's API calls.

Any ⚠️ or ❌ indicates a discrepancy that needs investigation.
