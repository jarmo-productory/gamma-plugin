# Extension Simulator

CLI tool for testing browser extension authentication flows outside the browser environment.

## Features

- Simulates Chrome extension APIs (storage, crypto, runtime)
- File-based storage persistence
- Environment configuration (local/production)
- Complete device authentication flow testing
- Colored console logging
- No external mocking libraries - custom implementation

## Installation

```bash
cd packages/simulator
npm install
npm run build
```

## Usage

### Basic Commands

```bash
# Show help
npm run simulator -- --help

# Register a new device
npm run simulator -- register --env local

# Pair device with user account
npm run simulator -- pair --env local

# Save presentation data
npm run simulator -- save --env production --url "https://gamma.app/..." --title "My Presentation"

# Check authentication status
npm run simulator -- status --env local

# Clear all data
npm run simulator -- clear
```

### Environment Selection

Use `--env` flag to select environment:
- `local` - Uses local development server (http://localhost:3000)
- `production` - Uses production server (https://productory-powerups.netlify.app)

## Architecture

### Chrome API Mocks
- `chrome.storage.local` - File-based JSON storage
- `crypto.subtle` - Node.js crypto wrapper
- `chrome.runtime` - Minimal runtime stubs

### Storage
- JSON file persistence in `./data/storage.json`
- Atomic writes with error handling
- Compatible with extension StorageManager interface

### Code Reuse
- Imports `DeviceAuth` class from shared package
- Uses same environment config structure as extension
- Maintains API compatibility

## Testing

```bash
# Run test script
npm run test

# Manual testing workflow
npm run simulator -- register --env local
npm run simulator -- pair --env local
npm run simulator -- status --env local
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```
