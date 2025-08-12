# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Important:** Track project state, progress, and tactical decisions in `PROJECT_STATE.md`. This file contains high-level mission, current sprint status, and detailed technical notes.

## Project Overview

The Gamma Timetable Extension is a comprehensive full-stack application that transforms Gamma presentations into synchronized, cloud-enabled timetables. The project consists of multiple interconnected components:

- **Chrome Extension** (MV3): Extracts slide content and generates timetables locally
- **Web Dashboard** (Next.js): User authentication, presentation management, settings
- **Backend Infrastructure** (Supabase + Netlify): Secure data persistence and API services
- **Authentication System** (Clerk): User management and device pairing
- **Shared Component Library**: Common utilities, types, and abstractions across platforms

### Current Development Phase

**Sprint 1: Authentication & Dashboard Shell** (In Progress)
- Web-first authentication with device pairing flow
- Extension remains fully functional offline
- Foundation for cross-device synchronization

## Development Commands

```bash
# Install dependencies (root + all packages)
npm install

# Development (streamlined workflow)
npm run dev              # Extension development only
npm run dev:web         # Full-stack web app with Netlify functions (port 3000)

# Production builds
npm run build           # Extension build
npm run build:extension # Extension build (same as above)
npm run build:web      # Web dashboard build
npm run build:shared   # Shared library build
npm run build:all      # All targets

# Code quality
npm run lint           # ESLint check
npm run format         # Prettier formatting
npm run quality        # Lint + format + type check

# Extension packaging
npm run package        # Create distributable ZIP
```

## Architecture

### Monorepo Structure

```
packages/
├── extension/          # Chrome Extension (MV3)
│   ├── src/background.js    # Service worker message broker
│   ├── src/content.ts       # DOM extraction from gamma.app
│   ├── src/sidebar/         # Main timetable UI
│   └── src/popup/           # Extension launcher
├── web/               # Web Dashboard (Next.js)
│   ├── src/pages/          # Landing, auth, dashboard pages
│   ├── src/components/     # React components
│   └── src/api/            # API routes (Netlify functions)
├── shared/            # Shared Component Library
│   ├── auth/              # Device pairing & token management
│   ├── config/            # Feature flags & environment
│   ├── storage/           # Unified storage abstraction
│   └── types/             # TypeScript definitions
supabase/              # Database schema & migrations
dev/                   # Local development tools
```

### Core Components

#### Chrome Extension (`packages/extension/`)

1. **Background Script** (`src/background.js`): MV3 service worker managing message routing between content scripts and sidebar, tab state coordination.

2. **Content Script** (`src/content.ts`): Injected into gamma.app pages to extract slide data using specific DOM selectors. Communicates via Chrome runtime messaging.

3. **Sidebar** (`src/sidebar/sidebar.js`): Primary UI displaying timetables, user authentication state, export functionality, and sync controls.

4. **Popup** (`src/popup/popup.js`): Simple launcher that opens the sidebar panel.

#### Web Dashboard (`packages/web/`)

1. **Landing Pages**: User onboarding and feature presentation
2. **Authentication Flow**: Clerk-powered sign-in/sign-up with device pairing
3. **Dashboard Shell**: Presentation management interface (Sprint 1)
4. **API Routes**: Netlify functions for device pairing and data synchronization

#### Backend Infrastructure

1. **Database** (Supabase PostgreSQL):
   - `users` table with Clerk integration
   - `presentations` table with atomic timetable storage
   - `devices` table for authentication pairing
   - Row-Level Security (RLS) for data isolation

2. **Authentication** (Clerk + Device Pairing):
   - Web-first login flow
   - Device registration and token exchange
   - Extension-to-user account linking

3. **API Layer** (Next.js on Netlify):
   - `/api/devices/register` - Device registration
   - `/api/devices/link` - User-device pairing
   - `/api/devices/exchange` - Token exchange
   - Future: presentation CRUD operations

### Data Flow

#### Local (Offline-First)
1. Content script extracts slides from gamma.app DOM
2. Background script routes messages between content script and sidebar
3. Sidebar receives slide data and generates/updates timetables
4. User interactions (duration changes, exports) handled locally
5. Timetable data persisted via Chrome storage API

#### Cloud Synchronization (Sprint 1+)
1. Extension registers device on first run → gets pairing code
2. User clicks "Sign In" → opens web dashboard with pairing code
3. User authenticates via Clerk → device linked to user account
4. Extension polls for authentication success → receives device token
5. Future: Automatic sync of timetable data to Supabase
6. Cross-device access via web dashboard and other extension instances

### Key Technologies

#### Frontend
- **Chrome Extension**: MV3 architecture, Vite build system
- **Web Dashboard**: Next.js, React, Tailwind CSS (planned)
- **Shared Library**: TypeScript with ESM/CJS dual builds

#### Backend & Infrastructure
- **Authentication**: Clerk (@clerk/clerk-js, @clerk/nextjs)
- **Database**: Supabase PostgreSQL with RLS
- **API**: Next.js API routes on Netlify
- **Deployment**: Netlify CI/CD, Chrome Web Store

#### Development Tools
- **Build System**: Vite with multi-target support
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Export Libraries**: SheetJS (XLSX), jsPDF
- **Local Dev**: SSL certificates, environment management

#### Libraries
- **SheetJS (XLSX)**: Excel export functionality (`packages/extension/src/lib/xlsx.full.min.js`)
- **jsPDF**: PDF generation
- **@clerk/clerk-js**: Extension authentication
- **@clerk/nextjs**: Web dashboard authentication

### Storage Architecture

#### Local Storage (Chrome Extension)
- **Chrome Storage API**: Offline timetable persistence per presentation URL
- **Storage Abstraction**: `packages/shared/storage/` - unified interface
- **Key Strategy**: Timetables keyed by presentation URL for isolation
- **Authentication State**: Device tokens and pairing status

#### Cloud Storage (Backend)
- **Supabase PostgreSQL**: User accounts and synchronized presentations
- **Row-Level Security**: Data isolation per user account
- **Atomic Updates**: Presentation data stored as JSON with metadata
- **Device Management**: Registration, pairing, and token lifecycle

### Build System

#### Multi-Target Build (Vite)
- **Extension Target**: Chrome MV3 with TypeScript compilation
- **Web Target**: Next.js with React and API routes
- **Shared Target**: Dual ESM/CJS builds for cross-platform compatibility
- **Version Sync**: Automated across package.json and manifests

#### Asset Management
- **Static Assets**: Icons, libraries, manifest files
- **TypeScript**: Strict mode with shared type definitions
- **Development**: File watching across all packages
- **Production**: Optimized builds with tree-shaking

## Development Notes

### Sprint-Based Development

The project follows a structured sprint methodology tracked in `PROJECT_STATE.md`:

- **High-level Mission**: Transform standalone extension into cloud-enabled service
- **Current Sprint**: Sprint 1 (Authentication & Dashboard Shell)
- **Sprint Planning**: Each sprint has specific deliverables and technical tasks
- **Progress Tracking**: Detailed status updates and technical decisions documented

### Authentication Strategy

**Current Approach (Sprint 1)**: Web-first authentication with device pairing

1. Extension generates device ID and pairing code on first run
2. "Sign In" button opens web dashboard with pairing code
3. User authenticates via Clerk on web → links device to account
4. Extension polls for successful pairing → receives device token
5. Device token enables API access for future sync operations

**Security Model**:
- Short-lived pairing codes (5 minutes, single-use)
- Device tokens with limited scope (1 hour TTL, refresh endpoint)
- Row-Level Security enforces user data boundaries

### Slide Extraction (Extension)

- **DOM Selectors**: `div.card-wrapper[data-card-id]` for slide containers
- **Content Parsing**: Titles, paragraphs, images, links, nested lists
- **Metadata Extraction**: Slide order, timestamps, presentation URL
- **Change Detection**: Reconciliation preserves user duration settings

### Message Passing Architecture

**Chrome Runtime Messaging**:
- `content-script` port: DOM extraction and slide updates
- `sidebar` port: UI interactions and authentication state
- Background script: Tab state management and message routing
- `externally_connectable`: Web dashboard communication (planned)

### Timetable Generation

- **Default Duration**: 5 minutes per slide
- **User Controls**: Sliders (0-60 minutes) with real-time updates
- **Time Calculations**: Automatic start/end times based on sequence
- **Persistence**: Local storage with future cloud sync capability
- **Reconciliation**: Preserves user customizations during slide updates

### Export Functionality

- **CSV**: Comma-separated with configurable delimiters
- **Excel**: SheetJS with formatted headers and styling
- **PDF**: jsPDF with custom layout and branding
- **Clipboard**: Direct CSV copy for quick sharing
- **Future**: Cloud sharing and collaboration features

### Feature Flag System

**Configuration Management** (`packages/shared/config/`):
- Environment-based feature toggles
- Development vs production API endpoints
- Authentication system enabling/disabling
- Gradual rollout capabilities

### Local Development Setup

**Required: Run Both Servers Simultaneously**

```bash
# Terminal 1: Extension Development Server
npm run dev
# → Builds extension to dist/ folder
# → Watches for changes and rebuilds automatically  
# → Load extension from dist/ in Chrome

# Terminal 2: Full-Stack Web Application  
npm run dev:web
# → Builds web app and serves with Netlify functions
# → http://localhost:3000 (web app + API endpoints)
# → All 6 functions loaded and working
```

**Extension Setup in Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode" 
3. Click "Load unpacked" → Select `dist/` folder
4. **Important:** Reload extension after any code changes

**Environment Configuration**:
- All environment variables automatically injected by Netlify dev
- SSL certificates managed by Netlify dev server  
- Supabase connection via environment variables
- Feature flags for development vs production

### Testing Strategy

**Manual Testing Workflow**:
```bash
# 1. Start both development servers
npm run dev       # Extension (dist/ folder)
npm run dev:web   # Web app (http://localhost:3000)

# 2. Load extension in Chrome from dist/ folder

# 3. Test complete authentication flow:
#    a) Click "Login" in extension sidebar
#    b) Extension opens http://localhost:3000/sign-in?code=XXXXXX  
#    c) Click "Sign in with Clerk" (mock auth)
#    d) Device should auto-link and show success
#    e) Extension should show "authenticated" state
#    f) "Test API" button should return 200 OK

# 4. Test timetable functionality on gamma.app
```

**Current API Endpoints Working**:
- ✅ `POST /api/devices/register` - Device registration
- ✅ `POST /api/devices/link` - Device pairing with authentication  
- ✅ `POST /api/devices/exchange` - JWT token issuance
- ✅ `GET /api/protected/ping` - Authenticated API access
- ✅ Web authentication flow with mock Clerk integration

**Future Test Automation**:
- **Unit Tests**: Core timetable logic, storage abstractions, export functions
- **Integration Tests**: Authentication flow, API endpoints, data synchronization  
- **E2E Tests**: Full user workflows across extension and web dashboard
- **Framework Suggestion**: Vitest (Vite-native) or Jest with Chrome extension mocking

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.