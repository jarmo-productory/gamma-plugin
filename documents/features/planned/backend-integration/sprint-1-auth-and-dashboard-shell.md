# Sprint 1: Authentication Integration & Web Dashboard Foundation

*   **Goal:** Build upon Sprint 0's abstraction layers to implement Clerk authentication and create the initial web dashboard, while maintaining the extension's offline-first functionality.

## Prerequisites from Sprint 0
- ✅ Storage abstraction layer (`StorageManager`)
- ✅ Authentication abstraction layer (`AuthManager`)
- ✅ Configuration system with feature flags
- ✅ Enhanced build configuration
- ✅ TypeScript type definitions
- ✅ UI preparations (disabled auth buttons)

## Core Principles
- **Extension Independence**: Chrome extension continues to work without authentication
- **Graceful Enhancement**: Auth features enhance but don't replace local functionality
- **Shared Components**: Begin extracting reusable code for both platforms
- **Progressive Rollout**: Use feature flags to control feature visibility

## Deliverables

### 1. **Clerk Integration in Extension**
*   Update `src/lib/auth.js` to integrate with Clerk:
    ```javascript
    import { config } from '../config/index.js';
    
    export class AuthManager {
      constructor() {
        this.token = null;
        this.user = null;
      }
      
      async initialize() {
        if (!config.features.authentication) {
          return; // Feature flag check
        }
        
        // Check for existing Clerk session
        try {
          const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
            credentials: 'include'
          });
          if (response.ok) {
            this.user = await response.json();
            this.token = await this.getToken();
          }
        } catch (error) {
          console.log('Auth check failed, continuing in offline mode');
        }
      }
      
      async signIn() {
        // Open web dashboard for authentication
        chrome.tabs.create({ 
          url: `${config.webDashboardUrl}/sign-in?from=extension&return=true` 
        });
      }
      
      async signOut() {
        this.token = null;
        this.user = null;
        // Notify UI components
        chrome.runtime.sendMessage({ type: 'auth-state-changed', authenticated: false });
      }
      
      async isAuthenticated() {
        return !!this.user && !!this.token;
      }
    }
    ```

### 2. **Web Dashboard Setup (Next.js)**
*   Initialize Next.js app in `/web` directory:
    ```bash
    npx create-next-app@latest web --typescript --tailwind --app
    ```
*   Install and configure Clerk:
    ```bash
    npm install @clerk/nextjs
    ```
*   Create authentication pages:
    - `/web/app/sign-in/page.tsx`
    - `/web/app/sign-up/page.tsx`
    - `/web/app/dashboard/page.tsx`

### 3. **Extension UI Updates**
*   Enable authentication UI in sidebar:
    ```javascript
    // sidebar.js updates
    const renderAuthSection = async () => {
      if (!config.features.authentication) {
        return ''; // Feature not enabled
      }
      
      const isAuthenticated = await auth.isAuthenticated();
      
      if (isAuthenticated) {
        return `
          <div class="auth-section">
            <span class="user-info">👤 ${auth.user.email}</span>
            <button id="sign-out-btn" class="auth-btn">Sign Out</button>
            <span class="sync-status">☁️ Sync Enabled</span>
          </div>
        `;
      } else {
        return `
          <div class="auth-section">
            <button id="sign-in-btn" class="auth-btn">🔐 Sign In</button>
            <span class="sync-status disabled">☁️ Local Only</span>
          </div>
        `;
      }
    };
    ```

### 4. **Shared Type Definitions**
*   Create comprehensive types in `/shared/types/`:
    ```typescript
    // user.types.ts
    export interface User {
      id: string;
      email: string;
      name?: string;
      createdAt: Date;
      subscription: 'free' | 'pro' | 'team';
    }
    
    // auth.types.ts
    export interface AuthState {
      isAuthenticated: boolean;
      user: User | null;
      token: string | null;
    }
    
    // sync.types.ts
    export interface SyncState {
      status: 'idle' | 'syncing' | 'error' | 'offline';
      lastSyncTime: Date | null;
      pendingChanges: number;
    }
    ```

### 5. **Extension-to-Web Communication**
*   Implement post-authentication flow:
    ```javascript
    // background.js additions
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'auth-callback') {
        // Handle return from web dashboard authentication
        auth.initialize().then(() => {
          // Notify all extension components
          chrome.runtime.sendMessage({ 
            type: 'auth-state-changed', 
            authenticated: true 
          });
        });
      }
    });
    ```

### 6. **Web Dashboard Structure**
    ```
    /web/
      /app/
        /api/
          /auth/
            me/route.ts      # Check auth status
        /(auth)/
          /sign-in/
            page.tsx         # Clerk SignIn component
          /sign-up/
            page.tsx         # Clerk SignUp component
        /(dashboard)/
          /dashboard/
            page.tsx         # Protected dashboard
          /presentations/
            page.tsx         # List presentations
        layout.tsx           # Root layout with ClerkProvider
        page.tsx            # Landing page
      /components/
        Navigation.tsx       # Shared navigation
        AuthButton.tsx      # Reusable auth button
      /lib/
        auth.ts             # Auth utilities
      /public/
        # Static assets
    ```

### 7. **Feature Flag Configuration**
*   Update config for Sprint 1:
    ```javascript
    // src/config/index.js
    export const config = {
      features: {
        cloudSync: false,        // Still false in Sprint 1
        authentication: true,    // Enable auth UI
        webDashboard: true,      // Enable dashboard
        autoSync: false         // Manual sync only for now
      },
      api: {
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      },
      webDashboardUrl: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'
    };
    ```

### 8. **Build Process Updates**
*   Update package.json:
    ```json
    {
      "scripts": {
        "dev": "concurrently \"npm run dev:extension\" \"npm run dev:web\"",
        "dev:extension": "vite --mode extension",
        "dev:web": "cd web && npm run dev",
        "build": "npm run build:extension && npm run build:web",
        "build:extension": "vite build --mode extension",
        "build:web": "cd web && npm run build"
      }
    }
    ```

### 9. **Storage Manager Enhancement**
*   Prepare for future cloud sync:
    ```javascript
    // src/lib/storage.js updates
    export class StorageManager {
      constructor(mode = 'local', auth = null) {
        this.mode = mode;
        this.auth = auth;
      }
      
      async save(key, data) {
        // Always save locally first
        const localResult = await saveData(key, data);
        
        // Prepare for cloud sync (Sprint 3)
        if (this.auth && await this.auth.isAuthenticated()) {
          // Queue for sync (not implemented yet)
          await this.queueForSync(key, data);
        }
        
        return localResult;
      }
      
      async queueForSync(key, data) {
        // Placeholder for Sprint 3
        const queue = await loadData('sync-queue') || [];
        queue.push({ key, data, timestamp: new Date() });
        await saveData('sync-queue', queue);
      }
    }
    ```

### 10. **User Onboarding Flow**
*   Implement the flow from `app-flow-user-onboarding.md`:
    - Extension shows "Sign In" button when not authenticated
    - Clicking opens web dashboard in new tab
    - User completes auth on web
    - Web dashboard redirects back with success message
    - Extension detects auth completion and updates UI

## Migration Path

### From Sprint 0 → Sprint 1
1. **Enable Feature Flags**: Set `authentication: true` in config
2. **Deploy Web Dashboard**: Initial deployment to Netlify
3. **Update Extension**: Release with auth UI enabled
4. **Monitor**: Track adoption and error rates

### Data Flow with Auth (Sprint 1)
```
User Action → Extension → StorageManager
                              ↓
                    Save to Chrome Storage
                              ↓
                    Queue for Sync (if authenticated)
                              ↓
                    [Manual Sync Button - Sprint 2]
```

## Success Criteria

- [ ] Extension continues to work offline
- [ ] Users can sign in via web dashboard
- [ ] Auth state persists across browser sessions
- [ ] Web dashboard shows user's presentations (local data for now)
- [ ] No breaking changes to existing functionality
- [ ] Feature flags control feature visibility
- [ ] Clean separation between auth and core functionality

## Testing Strategy

1. **Extension Testing**:
   - Verify offline functionality remains intact
   - Test auth flow from extension → web → extension
   - Ensure graceful degradation without auth

2. **Web Dashboard Testing**:
   - Test Clerk authentication flows
   - Verify protected routes work correctly
   - Test responsive design

3. **Integration Testing**:
   - Test communication between extension and web
   - Verify auth state synchronization
   - Test feature flag toggles

## Next Steps (Sprint 2 Preview)

- Implement manual sync functionality
- Add "Save to Cloud" / "Load from Cloud" buttons
- Create presentation management UI in dashboard
- Begin Supabase integration for data storage 