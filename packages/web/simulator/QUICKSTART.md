# Simulator Quick Start

Get up and running with the Gamma extension simulator in 5 minutes.

## Installation

```bash
cd packages/web/simulator
npm install
```

## Basic Workflow

### 1. Register Device (30 seconds)

```bash
npm run register
```

**Output:**
```
✅ Device registered successfully!

📋 Pairing Instructions:
1. Open this URL in your browser:
   http://localhost:3000/?source=extension&code=ABC123

Device Code: ABC123
```

### 2. Pair in Browser (1 minute)

1. **Copy the pairing URL** from step 1
2. **Open in browser** and sign in
3. **Approve device**

### 3. Exchange Token (1 second)

```bash
npm run pair
```

**Output:**
```
✅ Token received and saved!
🎉 Device paired successfully!
```

### 4. Save Presentation (1 second)

```bash
npm run save
```

**Output:**
```
✅ Presentation saved successfully!
```

## One-Line Commands

```bash
# Check status
npm run status

# Save custom URL
npm run save -- --url "https://gamma.app/docs/my-presentation"

# Clear all data
npm run clear
```

## File Structure

```
simulator/
├── src/
│   ├── auth/simulator.ts          # Device auth logic
│   ├── presentation/save.ts       # Presentation save with retry
│   ├── storage/file-storage.ts    # Node.js storage adapter
│   ├── types/index.ts             # TypeScript types
│   └── index.ts                   # CLI entry point
├── examples/
│   ├── test-against-api.sh        # Integration test script
│   └── compare-with-extension.md  # HAR comparison guide
├── bin/simulator.js               # Executable wrapper
├── package.json
├── tsconfig.json
├── README.md                      # Full documentation
├── TESTING.md                     # Testing scenarios
└── QUICKSTART.md                  # This file
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run register` | Register device, get pairing URL |
| `npm run pair` | Poll for device pairing |
| `npm run save` | Save mock presentation |
| `npm run status` | Show auth status |
| `npm run clear` | Clear all data |
| `npm run dev` | Show CLI help |

## Environment Variables

```bash
# Set API base URL (default: http://localhost:3000)
export API_BASE_URL="https://api.example.com"

# Set storage directory (default: ./.simulator-storage)
export STORAGE_DIR="/tmp/simulator-storage"
```

## Debugging

### View stored data:
```bash
cat .simulator-storage/device_info_v1.json
cat .simulator-storage/device_token_v1.json
```

### Test specific endpoint:
```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{"device_fingerprint":"test123"}'
```

## Troubleshooting

### ❌ "Device registration failed"
→ Make sure API server is running at `http://localhost:3000`

### ❌ "Not authenticated"
→ Run `npm run pair` to get a valid token

### ❌ "Device not linked" (timeout)
→ Make sure you opened the pairing URL and signed in

### ❌ "Save failed: 500"
→ Check API server logs and database connection

## Next Steps

- **Full testing guide**: See [TESTING.md](TESTING.md)
- **Complete docs**: See [README.md](README.md)
- **HAR comparison**: See [examples/compare-with-extension.md](examples/compare-with-extension.md)
- **Integration test**: Run `./examples/test-against-api.sh`

## API Endpoints Used

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/devices/register` | POST | None | Register device |
| `/api/devices/exchange` | POST | None | Exchange code for token |
| `/api/devices/refresh` | POST | Bearer | Refresh token |
| `/api/presentations/save` | POST | Bearer | Save presentation |

## Request/Response Examples

### Register
```bash
# Request
POST /api/devices/register
{"device_fingerprint":"abc123"}

# Response
{"deviceId":"uuid","code":"ABC123","expiresAt":"2025-10-05T20:00:00Z"}
```

### Exchange
```bash
# Request
POST /api/devices/exchange
{"deviceId":"uuid","code":"ABC123"}

# Response (success)
{"token":"jwt","expiresAt":"2025-10-06T20:00:00Z"}

# Response (not linked)
404 {"error":"Device not linked"}
```

### Save
```bash
# Request
POST /api/presentations/save
Authorization: Bearer <token>
{
  "gamma_url":"https://gamma.app/docs/test",
  "title":"Test",
  "timetable_data":{
    "title":"Test",
    "items":[{"id":"1","title":"Slide 1","duration":5}]
  }
}

# Response
{"id":"uuid","message":"Presentation saved successfully"}
```

## Performance

| Operation | Time |
|-----------|------|
| Register | ~100ms |
| Exchange (paired) | ~100ms |
| Exchange (polling) | 2s/attempt |
| Save | ~200ms |
| Refresh | ~100ms |

## Storage Files

All data stored in `.simulator-storage/`:

```json
// device_info_v1.json
{
  "deviceId": "uuid",
  "code": "ABC123",
  "expiresAt": "2025-10-05T20:00:00Z"
}

// device_token_v1.json
{
  "token": "eyJhbGc...",
  "expiresAt": "2025-10-06T20:00:00Z"
}

// install_id_v1.json
"inst_abc123def456..."
```

## Mock Data

Default mock presentation has 8 slides:

1. Introduction to TypeScript (5 min)
2. Setting Up Your Environment (8 min)
3. Basic Types and Interfaces (12 min)
4. Advanced Type Features (15 min)
5. Generics Deep Dive (10 min)
6. Decorators and Metadata (10 min)
7. Integration with React (12 min)
8. Best Practices (8 min)

**Total Duration:** 80 minutes

## Tips

- **Use status often**: `npm run status` shows auth state
- **Clear between tests**: `npm run clear` removes all data
- **Custom URLs**: Use `--url` flag for specific presentations
- **Check logs**: All requests/responses are logged
- **Compare with extension**: Export HAR and compare (see examples/)

---

**Ready to test?** Run `npm run register` and follow the pairing instructions!
