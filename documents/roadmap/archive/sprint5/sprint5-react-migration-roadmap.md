# Sprint 5: React Migration Roadmap
## Complete Guide from Current Foundation to Modern React App

**Created:** 2025-08-16  
**Status:** READY FOR EXECUTION  
**Foundation:** Sprint 4 React/Tailwind/shadcn/ui completed  
**Target:** Modern Next.js + React 18 + TypeScript application

---

## 🎯 Executive Summary

Sprint 4 delivered a complete React foundation with React 18, shadcn/ui, Tailwind CSS, and production-ready build system. Sprint 5 will leverage this foundation to migrate from vanilla JavaScript to a modern React application while maintaining all existing functionality and professional UX standards.

### What Sprint 4 Delivered (Foundation Complete ✅)
- **React 18.3.1 + TypeScript**: Full React development environment
- **shadcn/ui Components**: Button, Card, Input with Gamma design integration
- **Tailwind CSS 4.1.12**: Complete design system with 400+ lines of configuration
- **Build System Integration**: Vite + PostCSS + React plugin working perfectly
- **Component Library**: `packages/shared/ui/` with Gamma-specific React components
- **Migration Bridge**: Enhanced h() helper for gradual transition

### Sprint 5 Objectives
1. **Next.js App Router Migration**: Modern React framework with server components
2. **Component Migration**: All vanilla JS components → React components
3. **State Management**: Redux Toolkit or Zustand for complex state
4. **Route Management**: File-based routing with layouts and error boundaries
5. **Performance Optimization**: Code splitting, lazy loading, React optimizations

---

## 📋 Phase-by-Phase Migration Plan

### **Phase 1: Next.js Foundation Setup (Week 1)**

#### Day 1: Next.js Installation & Configuration
```bash
# Install Next.js 14 with App Router
npm install next@latest react@latest react-dom@latest
npm install @types/node @types/react @types/react-dom typescript

# Install Next.js specific dependencies
npm install @next/bundle-analyzer
npm install eslint-config-next
```

**Key Configuration Files:**
- `next.config.js` - Next.js configuration with monorepo support
- `app/layout.tsx` - Root layout with Tailwind CSS and theme provider
- `app/page.tsx` - Landing page component
- `middleware.ts` - Authentication and routing middleware

#### Day 2-3: Build System Integration
**Update Vite Configuration:**
```typescript
// vite.config.js enhancement for Next.js coexistence
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      external: ['next', 'next/router', 'next/head']
    }
  }
})
```

**Package.json Scripts Update:**
```json
{
  "scripts": {
    "dev:next": "next dev --port 3001",
    "build:next": "next build",
    "start:next": "next start",
    "dev:web": "npm run build:web && npx netlify dev --dir=dist-web",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:next\" \"npm run dev:web\""
  }
}
```

#### Day 4-5: Component Migration Infrastructure
**Create Component Factory Pattern:**
```typescript
// packages/shared/ui/component-factory.ts
export function createComponentMigration<P>(
  legacyComponent: (props: P) => HTMLElement,
  reactComponent: React.ComponentType<P>
) {
  return {
    legacy: legacyComponent,
    react: reactComponent,
    useReact: process.env.USE_REACT_COMPONENTS === 'true'
  }
}
```

### **Phase 2: Core Component Migration (Week 2)**

#### Day 6-8: Sidebar Component Migration
**Target Components:**
- `TimetableItem` (already created in Sprint 4)
- `SyncControls` (already created in Sprint 4)
- `ExportControls` (already created in Sprint 4)
- `AuthenticationStatus`
- `PresentationHeader`

**Migration Pattern Example:**
```typescript
// packages/shared/ui/timetable-sidebar.tsx
import { TimetableItem, SyncControls, ExportControls } from './gamma-components'

interface TimetableSidebarProps {
  presentations: PresentationData[]
  authState: AuthenticationState
  onSync: (action: SyncAction) => void
  onExport: (format: ExportFormat) => void
}

export function TimetableSidebar({
  presentations,
  authState,
  onSync,
  onExport
}: TimetableSidebarProps) {
  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <h1 className="text-xl font-bold">Gamma Timetable</h1>
        <AuthenticationStatus authState={authState} />
      </div>
      
      <div className="sidebar-content">
        {presentations.map((presentation) => (
          <TimetableItem
            key={presentation.id}
            title={presentation.title}
            duration={presentation.duration}
            onDurationChange={(duration) => 
              onSync({ type: 'UPDATE_DURATION', presentationId: presentation.id, duration })
            }
          />
        ))}
      </div>
      
      <div className="sidebar-footer">
        <SyncControls
          isAuthenticated={authState.isAuthenticated}
          isSyncing={authState.isSyncing}
          autoSync={authState.autoSync}
          onSaveToCloud={() => onSync({ type: 'SAVE_TO_CLOUD' })}
          onLoadFromCloud={() => onSync({ type: 'LOAD_FROM_CLOUD' })}
          onToggleAutoSync={() => onSync({ type: 'TOGGLE_AUTO_SYNC' })}
        />
        
        <ExportControls
          onExportCsv={() => onExport('csv')}
          onExportExcel={() => onExport('excel')}
          onExportPdf={() => onExport('pdf')}
        />
      </div>
    </div>
  )
}
```

#### Day 9-10: Dashboard Component Migration
**Create React Dashboard:**
```typescript
// app/dashboard/page.tsx
import { PresentationGrid } from '@ui/presentation-grid'
import { DashboardHeader } from '@ui/dashboard-header'
import { useAuthContext } from '@hooks/use-auth'
import { usePresentations } from '@hooks/use-presentations'

export default function DashboardPage() {
  const { user, authState } = useAuthContext()
  const { presentations, isLoading, error } = usePresentations()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBoundary error={error} />

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      <main className="max-w-dashboard mx-auto px-6 py-8">
        <PresentationGrid presentations={presentations} />
      </main>
    </div>
  )
}
```

### **Phase 3: State Management & API Integration (Week 3)**

#### Day 11-13: Redux Toolkit Setup
**Install State Management:**
```bash
npm install @reduxjs/toolkit react-redux
npm install @types/react-redux
```

**Store Configuration:**
```typescript
// packages/shared/store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/auth-slice'
import presentationsSlice from './slices/presentations-slice'
import syncSlice from './slices/sync-slice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    presentations: presentationsSlice,
    sync: syncSlice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

#### Day 14-15: React Query Integration
**API State Management:**
```typescript
// packages/shared/hooks/use-presentations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@shared/api/api-client'

export function usePresentations() {
  return useQuery({
    queryKey: ['presentations'],
    queryFn: apiClient.presentations.list,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useSavePresentation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.presentations.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] })
    }
  })
}
```

### **Phase 4: Routing & Layouts (Week 4)**

#### Day 16-17: App Router Implementation
**File Structure:**
```
app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page
├── dashboard/
│   ├── layout.tsx            # Dashboard layout
│   ├── page.tsx              # Dashboard home
│   └── presentations/
│       ├── [id]/
│       │   └── page.tsx      # Individual presentation
│       └── page.tsx          # Presentations list
├── auth/
│   ├── sign-in/
│   │   └── page.tsx          # Sign in page
│   └── callback/
│       └── page.tsx          # Auth callback
└── api/                      # API routes (optional)
    └── health/
        └── route.ts          # Health check
```

#### Day 18-20: Error Boundaries & Loading States
**Error Boundary Setup:**
```typescript
// app/error.tsx
'use client'
import { useEffect } from 'react'
import { Button } from '@ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong!
        </h2>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
```

---

## 🛠️ Technical Implementation Details

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@shared'],
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Support for monorepo shared packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, 'packages/shared'),
      '@ui': path.resolve(__dirname, 'packages/shared/ui'),
      '@lib': path.resolve(__dirname, 'packages/shared/lib'),
    }
    return config
  },
}

module.exports = nextConfig
```

### TypeScript Configuration Update
```json
// tsconfig.json enhancement
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@shared/*": ["./packages/shared/*"],
      "@ui/*": ["./packages/shared/ui/*"],
      "@lib/*": ["./packages/shared/lib/*"],
      "@hooks/*": ["./packages/shared/hooks/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ]
}
```

### Environment Variables
```bash
# .env.local for Next.js development
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
```

---

## 📊 Migration Strategy & Backward Compatibility

### Gradual Migration Approach
1. **Coexistence Phase**: Both vanilla JS and React components work simultaneously
2. **Feature Flag System**: Toggle between implementations during development
3. **Progressive Enhancement**: Add React features without removing vanilla JS functionality
4. **Component Factory**: Unified interface for both implementations

### Backward Compatibility Plan
```typescript
// packages/shared/ui/compatibility-layer.ts
export function renderComponent<P>(
  componentName: string,
  props: P,
  container: HTMLElement
) {
  if (process.env.USE_REACT_COMPONENTS === 'true') {
    // Render React component
    const Component = ReactComponents[componentName]
    ReactDOM.render(<Component {...props} />, container)
  } else {
    // Render vanilla JS component
    const component = VanillaComponents[componentName]
    const element = component(props)
    container.appendChild(element)
  }
}
```

### Extension Integration Strategy
```typescript
// packages/extension/src/react-bridge.ts
export class ReactBridge {
  private reactRoot: Root | null = null

  initialize(container: HTMLElement) {
    if (this.reactRoot) return
    
    this.reactRoot = createRoot(container)
    this.reactRoot.render(
      <StrictMode>
        <Provider store={store}>
          <TimetableSidebar />
        </Provider>
      </StrictMode>
    )
  }

  destroy() {
    if (this.reactRoot) {
      this.reactRoot.unmount()
      this.reactRoot = null
    }
  }
}
```

---

## 🎯 Success Metrics & Validation

### Technical Metrics
- [ ] **100% Component Migration**: All vanilla JS components converted to React
- [ ] **Zero Regression**: All existing functionality preserved
- [ ] **Performance Improvement**: 20% faster rendering with React optimizations
- [ ] **Bundle Size Optimization**: Tree shaking reduces bundle by 15%
- [ ] **Type Safety**: 100% TypeScript coverage in React components

### User Experience Metrics
- [ ] **Visual Consistency**: Pixel-perfect match with existing design
- [ ] **Interaction Fidelity**: All animations and transitions preserved
- [ ] **Accessibility**: Improved WCAG 2.1 AA compliance with React patterns
- [ ] **Performance**: No perceived performance degradation
- [ ] **Developer Experience**: 50% faster component development

### Quality Assurance
- [ ] **Test Coverage**: 90% test coverage for React components
- [ ] **E2E Testing**: All user workflows validated in React implementation
- [ ] **Cross-Browser**: Consistent behavior across Chrome, Firefox, Safari
- [ ] **Mobile Responsive**: React components work on all screen sizes

---

## 🚀 Deployment Strategy

### Development Environment
```bash
# Three-tier development setup
npm run dev              # Extension (existing vanilla JS)
npm run dev:next         # Next.js React app (port 3001)
npm run dev:web          # Netlify functions (port 3000)

# Unified development
npm run dev:full         # All three environments simultaneously
```

### Production Deployment
1. **Phase 1**: Deploy Next.js app alongside existing Netlify deployment
2. **Phase 2**: Feature flag toggle for gradual user migration
3. **Phase 3**: Complete migration with vanilla JS deprecation
4. **Phase 4**: Bundle optimization and cleanup

### Chrome Extension Integration
```typescript
// Update manifest.json for React extension
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "web_accessible_resources": [{
    "resources": ["react-sidebar.html"],
    "matches": ["https://gamma.app/*"]
  }]
}
```

---

## 📁 Deliverable Structure

### New Files Created
```
app/                                    # Next.js app directory
├── layout.tsx                         # Root layout with providers
├── page.tsx                           # Landing page
├── dashboard/                          # Dashboard routes
├── auth/                              # Authentication routes
└── globals.css                        # Global styles with Tailwind

packages/shared/
├── hooks/                             # React hooks
│   ├── use-auth.ts                    # Authentication hook
│   ├── use-presentations.ts           # Presentations data hook
│   └── use-sync.ts                    # Sync operations hook
├── store/                             # Redux store
│   ├── index.ts                       # Store configuration
│   └── slices/                        # Redux slices
└── ui/
    ├── layouts/                       # Layout components
    ├── forms/                         # Form components
    └── data-display/                  # Data display components
```

### Updated Files
```
vite.config.js                        # React + Next.js support
tsconfig.json                         # Next.js paths and compiler options
package.json                          # Next.js dependencies and scripts
tailwind.config.js                    # Next.js content paths
```

---

## ⚡ Next Steps for Implementation

### Immediate Actions Required
1. **Team Approval**: Review and approve Sprint 5 migration plan
2. **Resource Allocation**: Assign 4-week dedicated development time
3. **Environment Setup**: Create Next.js development environment
4. **Dependency Installation**: Install React, Next.js, and state management libraries

### Week 1 Kickoff Tasks
1. **Next.js Configuration**: Complete app router setup
2. **Build System Integration**: Ensure coexistence with existing Vite build
3. **Component Factory**: Implement migration bridge pattern
4. **Development Workflow**: Establish three-tier development environment

---

**SPRINT 5 READY FOR EXECUTION**
**Foundation**: Sprint 4 React foundation complete ✅
**Estimated Duration**: 4 weeks
**Risk Level**: Low (building on proven foundation)
**Expected Outcome**: Modern React application with maintained UX quality