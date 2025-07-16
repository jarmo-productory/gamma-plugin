# PRD: Backend Integration for Gamma Timetable Extension

## 1. Executive Summary

### Vision
Transform the Gamma Timetable Extension from a standalone browser extension into a cloud-enabled service that provides seamless synchronization of presentation timings across devices and browsers, enabling users to access their work from anywhere.

### Value Proposition
- **Cross-Device Synchronization**: Access your presentation timings from any browser or device
- **Data Persistence**: Never lose your work - all timings are backed up to the cloud
- **Collaboration Ready**: Foundation for future team collaboration features
- **Version History**: Track changes to your presentations over time
- **Offline Support**: Continue working offline with automatic sync when reconnected

## 2. Problem Statement

### Current Limitations
1. **Single Device Constraint**: Users can only access their timings on the device where they created them
2. **Data Loss Risk**: Browser data clearing or extension removal results in lost work
3. **No Backup**: No recovery mechanism if local storage is corrupted
4. **Limited Sharing**: Cannot easily share timetable configurations with colleagues
5. **No Analytics**: No insights into how presentations are being used

### User Pain Points
- "I created a timetable on my work computer but need to present from my laptop"
- "I accidentally cleared my browser data and lost hours of timing work"
- "I want my co-presenter to see the timing breakdown I created"
- "I need to track which version of timings we used in last week's training"

## 3. Goals & Objectives

### Primary Goals
- **Cloud Storage**: Securely store user presentation timing data in a robust, scalable Postgres database hosted by **Supabase**.
- **Cross-Device Sync**: Enable seamless synchronization of data across multiple devices and browsers via **Next.js API routes on Netlify**.
- **User Authentication**: Implement a secure, polished, and user-friendly authentication system using **Clerk**, providing pre-built UI and a superior developer experience.

### Secondary Goals
- **Web Dashboard**: Provide a user-friendly web interface for users to view, manage, and organize their presentations.
- **Collaboration**: Enable team collaboration features, allowing multiple users to collaborate on a single presentation.
- **Version History**: Maintain a history of changes to presentations, allowing users to revert to previous versions.
- **Analytics**: Gain insights into how presentations are being used, enabling data-driven decisions.

## 4. Technical Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐        ┌─────────────────────────────┐    │
│  │ Chrome Extension │◀──────▶│    Service Worker         │    │
│  │  (Frontend)      │        │  (Sync & Cache Manager)   │    │
│  └─────────────────┘        └──────────┬──────────────────┘    │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │ HTTPS/REST
┌─────────────────────────────────────────┼────────────────────────┐
│                         API Gateway      ▼                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐        ┌──────────────────┐    ┌────────────┐ │
│  │ Authentication   │        │      API Routes            │    │
│  │   Service        │◀──────▶│  /api/v1/presentations    │    │
│  │  (Clerk)         │        │  /api/v1/sync             │    │
│  └─────────────────┘        └──────────┬──────────────────┘    │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │
┌─────────────────────────────────────────┼────────────────────────┐
│                    Backend Services      ▼                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │ Presentation     │    │  Sync Engine     │    │ Analytics  │ │
│  │   Service        │◀──▶│  (Conflict Res.) │◀──▶│  Service   │ │
│  └─────────────────┘    └──────────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────┼────────────────────────┐
│           ▼              Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │   PostgreSQL    │    │     Redis        │    │    S3      │ │
│  │  (Primary DB)   │    │   (Cache)        │    │  (Backups) │ │
│  └─────────────────┘    └──────────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack Recommendations

#### Backend
- **Runtime**: Node.js with TypeScript (consistency with extension)
- **Framework**: Next.js
- **Database**: Supabase PostgreSQL (relational data, JSONB for flexibility)
- **Cache**: Redis (session management, real-time sync)
- **Authentication**: Clerk
- **API**: RESTful with GraphQL consideration for future
- **Hosting**: Netlify

#### Infrastructure
- **CDN**: Cloudflare (API caching, DDoS protection)
- **Monitoring**: Sentry (errors), PostHog (analytics)
- **CI/CD**: GitHub Actions
- **IaC**: Terraform or Pulumi

## 5. Functional Requirements

### 5.1 User Authentication (Leveraging Clerk)
- **Centralized Sign-Up**: New user registration will occur exclusively through the Web Dashboard to streamline the onboarding process.
- **Effortless Sign-In**: Users can log in directly from either the Chrome Extension or the Web Dashboard.
- **Guided Onboarding**: The Chrome Extension will guide new users to the Web Dashboard for account creation via a direct link.
- **Unified Session**: A user logged into one client (web or extension) will be automatically authenticated on the other within the same browser, creating a seamless experience.
- **Account Management**: All account management (profile updates, password changes) will be handled in the Web Dashboard using Clerk's components.

### 5.2 Data Synchronization (Leveraging Supabase & Next.js)
- **API-Driven Sync**: The Chrome extension will communicate with a set of **Next.js API routes** hosted on Netlify for all data operations.
- **Real-time Capabilities**: Leverage **Supabase's real-time features** to instantly push data changes to connected clients where applicable.
- **Conflict Resolution**: Implement a "last-write-wins" strategy for resolving conflicts from offline edits, using `updatedAt` timestamps.
- **Data Schema**: All data will be stored in a **Supabase Postgres** database, with tables including `users` and `presentations`, linked by a user ID.

### 5.3 API Layer (Next.js on Netlify)
- The backend logic will be implemented as serverless functions within a **Next.js application**.
- All API routes will be protected, requiring a valid JWT issued by Clerk.
- Example API Routes:
    - `GET /api/presentations`: Fetch all presentations for the authenticated user.
    - `POST /api/presentations`: Create a new presentation.
    - `PUT /api/presentations/:id`: Update an existing presentation.
    - `DELETE /api/presentations/:id`: Delete a presentation.

### 5.4 Web Dashboard
- **Presentation Management**: Users can view a list of all their presentations, with options to sort and search.
- **CRUD Operations**: Users can create, view, update, and delete presentations directly from the web interface.
- **Account Management**: Users can manage their profile and authentication settings through embedded Clerk components.
- **Responsive Design**: The dashboard will be fully responsive and accessible on modern web browsers on desktop and mobile devices.

## 6. Non-Functional Requirements
- **Scalability**: The **serverless architecture on Netlify** and the scalable nature of **Supabase** will allow the system to grow with the user base without manual intervention.
- **Security**:
    - All data encrypted in transit (TLS) and at rest (standard on Supabase).
    - Authentication and session management are delegated to **Clerk**, a specialized and secure service.
    - Database access is protected by **Supabase's Row Level Security (RLS)**, ensuring users can only access their own data.
- **Performance**: API responses, powered by **Netlify's edge network**, should consistently be under 200ms for typical operations.
- **Reliability**: Target 99.9% uptime, leveraging the high availability of **Netlify** and Supabase.

## 7. Success Metrics
- **User Adoption**: >20% of existing users adopt the new cloud features within 3 months.
- **Sign-up Conversion**: Achieve a >70% completion rate for the sign-up flow, tracked via Clerk's analytics.
- **Engagement**: >50% of authenticated users log in more than once a week.
- **Performance**: Average API response time remains below 200ms.
- **Error Rate**: API error rate below 0.1%.

## 8. Future Considerations
- **Team Collaboration**: Clerk's built-in support for "Organizations" provides a direct path for implementing team-based features.
- **Public Sharing**: The API can be extended with endpoints that allow for public, read-only access to specific presentations.
- **Version History**: The Supabase database can be augmented to store historical snapshots of presentation data.

## 9. Data Model

### Core Entities

```typescript
// User
interface User {
  id: string;
  email: string;
  name?: string;
  subscription_tier: 'free' | 'pro' | 'team';
  created_at: Date;
  last_sync_at: Date;
}

// Presentation
interface Presentation {
  id: string;
  user_id: string;
  gamma_presentation_id: string;
  url: string;
  title: string;
  total_slides: number;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Timetable Configuration
interface TimetableConfig {
  id: string;
  presentation_id: string;
  name: string;
  is_default: boolean;
  settings: {
    start_time: string;
    default_duration: number;
    break_duration: number;
  };
  created_at: Date;
  updated_at: Date;
}

// Timetable Item
interface TimetableItem {
  id: string;
  config_id: string;
  slide_id: string;
  order_index: number;
  title: string;
  content_summary: string;
  duration: number;
  item_type: 'slide' | 'break';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Sync Metadata
interface SyncMetadata {
  id: string;
  user_id: string;
  device_id: string;
  last_sync_at: Date;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  changes_pending: number;
}
```

## 10. API Design

### RESTful Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/presentations
POST   /api/v1/presentations
GET    /api/v1/presentations/:id
PUT    /api/v1/presentations/:id
DELETE /api/v1/presentations/:id

GET    /api/v1/presentations/:id/configs
POST   /api/v1/presentations/:id/configs
GET    /api/v1/presentations/:id/configs/:configId
PUT    /api/v1/presentations/:id/configs/:configId
DELETE /api/v1/presentations/:id/configs/:configId

POST   /api/v1/sync/push
POST   /api/v1/sync/pull
GET    /api/v1/sync/status

GET    /api/v1/user/profile
PUT    /api/v1/user/profile
GET    /api/v1/user/usage
```

### Authentication Flow
1. **Initial Setup**: User creates account via extension
2. **Token Management**: JWT with refresh token rotation
3. **Device Registration**: Each browser instance gets unique device ID
4. **Session Handling**: 30-day refresh tokens, 1-hour access tokens

## 11. Synchronization Strategy

### Conflict Resolution
- **Last Write Wins**: Default strategy with timestamp comparison
- **Version Vectors**: Track changes per device for merge capabilities
- **Manual Resolution**: UI for complex conflicts

### Offline Support
1. **Local First**: All changes saved locally immediately
2. **Queue System**: Changes queued when offline
3. **Background Sync**: Service worker handles sync when online
4. **Conflict Detection**: Server validates and merges changes

### Sync Protocol
```typescript
interface SyncRequest {
  device_id: string;
  last_sync_timestamp: Date;
  changes: Change[];
  client_version: string;
}

interface Change {
  entity_type: 'presentation' | 'config' | 'item';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  device_id: string;
}

interface SyncResponse {
  success: boolean;
  server_timestamp: Date;
  changes_to_apply: Change[];
  conflicts: Conflict[];
  next_sync_token: string;
}
```

## 12. Migration Strategy

### Phase 1: Foundation (Month 1-2)
- Set up backend infrastructure
- Implement authentication system
- Create basic API endpoints
- Update extension with auth UI

### Phase 2: Basic Sync (Month 2-3)
- Implement presentation storage
- Add manual save/load functionality
- Create conflict detection
- Beta test with power users

### Phase 3: Auto Sync (Month 3-4)
- Implement service worker sync
- Add offline queue system
- Create conflict resolution UI
- Performance optimization

### Phase 4: Advanced Features (Month 4-6)
- Version history
- Sharing capabilities
- Team workspaces
- Analytics dashboard

## 13. Extension Modifications

### New Components
```typescript
// Auth Manager
class AuthManager {
  async login(email: string, password: string): Promise<AuthToken>;
  async logout(): Promise<void>;
  async refreshToken(): Promise<AuthToken>;
  isAuthenticated(): boolean;
}

// Sync Manager
class SyncManager {
  async syncNow(): Promise<SyncResult>;
  async queueChange(change: Change): Promise<void>;
  async resolveConflict(conflict: Conflict, resolution: Resolution): Promise<void>;
  getSyncStatus(): SyncStatus;
}

// Storage Adapter
class StorageAdapter {
  async saveLocal(data: any): Promise<void>;
  async saveRemote(data: any): Promise<void>;
  async load(preferRemote: boolean): Promise<any>;
  async merge(local: any, remote: any): Promise<any>;
}
```

### UI Changes
1. **Login/Signup Flow**: Modal or dedicated page
2. **Sync Status Indicator**: Show sync state in toolbar
3. **Conflict Resolution**: Dialog for handling conflicts
4. **Settings Enhancement**: Cloud sync preferences
5. **Version History**: Browse and restore previous versions

## 14. Security Considerations

### Data Protection
- **Encryption**: AES-256 for data at rest
- **TLS**: All API communications over HTTPS
- **Token Security**: Secure storage in extension
- **CORS**: Strict origin validation

### Privacy
- **Data Minimization**: Only sync necessary data
- **User Control**: Easy data export/deletion
- **GDPR Compliance**: Right to be forgotten
- **Audit Logs**: Track all data access

### Rate Limiting
- **API Limits**: 100 requests/minute for free tier
- **Sync Limits**: 10 syncs/minute per device
- **Storage Limits**: 100 presentations free tier
- **Bandwidth**: 1GB/month for free tier



---

*Document Version: 1.0*  
*Created: January 2024*  
*Status: Planned*  
*Author: System Architecture Team* 