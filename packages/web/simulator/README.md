# Gamma Extension Simulator

Node.js simulator for testing Gamma extension authentication and presentation save flows without the browser extension.

## Features

- **Device Registration Flow**: Register device and get pairing URL
- **Token Exchange Polling**: Poll for device pairing (matches extension behavior)
- **Token Refresh**: Automatic token refresh before expiry
- **Presentation Save**: Save mock presentations with retry logic
- **Full Request/Response Logging**: Debug API interactions
- **File-based Storage**: Simulates chrome.storage.local

## Installation

```bash
cd packages/web/simulator
npm install
```

## Configuration

Set environment variables:

```bash
export API_BASE_URL="http://localhost:3000"  # or https://your-api.com
export STORAGE_DIR="./.simulator-storage"
```

## Usage

### 1. Register Device

```bash
npm run register
# or
./bin/simulator.js register
```

**Output:**
- Device ID
- Pairing code
- Pairing URL (opens in browser)
- Code expiry time

### 2. Pair Device

Open the pairing URL in your browser, sign in, then:

```bash
npm run pair
# or
./bin/simulator.js pair
```

This polls the exchange endpoint every 2 seconds until the device is paired.

**Optional:** Manually specify code:
```bash
./bin/simulator.js pair ABC123
```

### 3. Save Presentation

```bash
npm run save
# or
./bin/simulator.js save --url "https://gamma.app/docs/my-presentation"
```

**Features:**
- Generates mock timetable data (8 slides)
- Uses Bearer token authentication
- Implements retry logic (3 attempts, exponential backoff)
- Full request/response logging

### 4. Check Status

```bash
npm run status
# or
./bin/simulator.js status
```

Shows:
- Device registration status
- Token validity and expiry
- Code expiry

### 5. Clear Data

```bash
npm run clear
# or
./bin/simulator.js clear
```

## Example Workflow

```bash
# 1. Register device
npm run register

# 2. Open the pairing URL in browser and sign in

# 3. Pair device (polls until linked)
npm run pair

# 4. Save a presentation
npm run save --url "https://gamma.app/docs/test"

# 5. Check status
npm run status
```

## API Endpoints Used

Exactly matches extension endpoints:

### Device Registration
- **POST** `/api/devices/register`
- Body: `{ device_fingerprint: string }`
- Response: `{ deviceId, code, expiresAt }`

### Token Exchange
- **POST** `/api/devices/exchange`
- Body: `{ deviceId, code }`
- Response: `{ token, expiresAt }` or 404 (not linked)

### Token Refresh
- **POST** `/api/devices/refresh`
- Headers: `Authorization: Bearer <token>`
- Response: `{ token, expiresAt }`

### Save Presentation
- **POST** `/api/presentations/save`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Body: `{ gamma_url, title, start_time, total_duration, timetable_data }`
- Response: `{ id, ... }`

## Request Headers

All authenticated requests include:
- `Authorization: Bearer <device_token>`
- `Content-Type: application/json`

## Error Handling

### Token Exchange
- `404`: Device not linked yet (continues polling)
- `425`: Too early (continues polling)
- Other errors: Throws exception

### Presentation Save
- `401`: Not authenticated
- `500`: Server error
- Implements 3 retries with exponential backoff

## Storage

File-based storage in `.simulator-storage/`:
- `device_info_v1.json` - Device registration
- `device_token_v1.json` - Auth token
- `install_id_v1.json` - Stable device ID

## Debugging

All HTTP requests/responses are logged:

```
🔐 Registering device...
API URL: http://localhost:3000/api/devices/register
Device Fingerprint: abc123...
Response Status: 200
Response Body: {"deviceId":"...","code":"ABC123","expiresAt":"..."}
```

## Comparison with Extension

| Feature | Extension | Simulator |
|---------|-----------|-----------|
| Storage | `chrome.storage.local` | File-based JSON |
| Device Fingerprint | Browser-based | Node.js-based |
| API Calls | `fetch` with extension headers | `fetch` with same headers |
| Polling | 2500ms interval | 2000ms interval |
| Retry Logic | Exponential backoff | Same |

## Development

```bash
# Build TypeScript
npm run build

# Run with tsx (faster)
npm run dev register

# Run compiled version
node dist/index.js register
```

## Testing Against Real API

1. Start your API server:
   ```bash
   cd packages/web
   npm run dev
   ```

2. In another terminal:
   ```bash
   cd packages/web/simulator
   export API_BASE_URL="http://localhost:3000"
   npm run register
   ```

3. Compare network requests with browser extension using HAR export

## Troubleshooting

### "Not authenticated" error
- Run `npm run status` to check token
- Run `npm run pair` to get new token
- Check token expiry time

### "Device not linked" error
- Make sure you opened the pairing URL
- Signed in with Gamma account
- Pairing code hasn't expired

### Save fails with 500
- Check API server logs
- Verify request payload format
- Check database connection

## License

MIT
