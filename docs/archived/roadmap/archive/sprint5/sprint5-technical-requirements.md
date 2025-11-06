# Sprint 5: Technical Requirements
## Next.js App Router & Full React Migration

**Created:** 2025-08-16  
**Status:** READY FOR IMPLEMENTATION  
**Foundation:** Sprint 4 React foundation complete  
**Target:** Production-ready Next.js 14 App Router application

---

## 🎯 Technical Objectives

### Primary Goals
1. **Complete React Migration**: Transform all vanilla JavaScript components to React
2. **Next.js App Router**: Modern file-based routing with layouts and server components
3. **State Management**: Redux Toolkit for complex state, React Query for server state
4. **Performance Optimization**: Code splitting, lazy loading, React 18 optimizations
5. **Type Safety**: 100% TypeScript coverage across React application

### Success Criteria
- [ ] **Zero Regression**: All existing functionality preserved
- [ ] **Performance Improvement**: 20% faster rendering with React optimizations
- [ ] **Developer Experience**: 50% faster component development
- [ ] **Type Safety**: Complete TypeScript coverage
- [ ] **Production Ready**: Deployed Next.js application at new subdomain

---

## 📦 Dependencies & Installation

### Core Dependencies
```bash
# Next.js 14 with App Router
npm install next@latest react@latest react-dom@latest
npm install @types/node @types/react @types/react-dom

# State Management
npm install @reduxjs/toolkit react-redux @types/react-redux
npm install @tanstack/react-query @tanstack/react-query-devtools

# Development & Build Tools
npm install @next/bundle-analyzer eslint-config-next
npm install concurrently cross-env

# Additional React Ecosystem
npm install react-hook-form @hookform/resolvers zod
npm install react-error-boundary
npm install next-themes next-auth
```

### Enhanced Package.json Scripts
```json
{
  "scripts": {
    "dev:next": "next dev --port 3001",
    "build:next": "next build",
    "start:next": "next start",
    "export:next": "next build && next export",
    
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:next\" \"npm run dev:web\"",
    "build:all": "npm run build:extension && npm run build:web && npm run build:next",
    
    "analyze:next": "cross-env ANALYZE=true npm run build:next",
    "type-check:next": "tsc --project next.tsconfig.json --noEmit"
  }
}
```

---

## 🏗️ Next.js Configuration

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // App Router configuration
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Monorepo support
  transpilePackages: ['@shared'],
  
  // Webpack configuration for shared packages
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Alias configuration for monorepo
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, 'packages/shared'),
      '@ui': path.resolve(__dirname, 'packages/shared/ui'),
      '@lib': path.resolve(__dirname, 'packages/shared/lib'),
      '@hooks': path.resolve(__dirname, 'packages/shared/hooks'),
      '@store': path.resolve(__dirname, 'packages/shared/store'),
      '@api': path.resolve(__dirname, 'packages/shared/api')
    }
    
    // Handle CSS imports in shared packages
    config.module.rules.push({
      test: /\.css$/,
      include: path.resolve(__dirname, 'packages/shared'),
      use: ['style-loader', 'css-loader', 'postcss-loader']
    })
    
    return config
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    plugins: [
      require('@next/bundle-analyzer')({
        enabled: true,
      }),
    ],
  }),
  
  // Image optimization
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif']
  },
  
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Output configuration
  output: 'standalone',
  distDir: 'dist-next'
}

module.exports = nextConfig
```

### TypeScript Configuration
```json
// next.tsconfig.json - Next.js specific TypeScript config
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@shared/*": ["./packages/shared/*"],
      "@ui/*": ["./packages/shared/ui/*"],
      "@lib/*": ["./packages/shared/lib/*"],
      "@hooks/*": ["./packages/shared/hooks/*"],
      "@store/*": ["./packages/shared/store/*"],
      "@api/*": ["./packages/shared/api/*"]
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
    ".next/types/**/*.ts",
    "app/**/*",
    "packages/shared/**/*"
  ],
  "exclude": [
    "node_modules",
    "packages/extension/**/*",
    "netlify/**/*"
  ]
}
```

---

## 📁 App Router Structure

### Directory Architecture
```
app/                                    # Next.js 14 App Router
├── layout.tsx                         # Root layout with providers
├── page.tsx                           # Landing page (replaces index.html)
├── loading.tsx                        # Global loading UI
├── error.tsx                          # Global error boundary
├── not-found.tsx                      # 404 page
├── globals.css                        # Tailwind CSS + shadcn/ui styles
│
├── (auth)/                            # Route group for auth pages
│   ├── layout.tsx                     # Auth-specific layout
│   ├── sign-in/
│   │   └── page.tsx                   # Sign in page
│   ├── sign-up/
│   │   └── page.tsx                   # Sign up page
│   └── callback/
│       └── page.tsx                   # OAuth callback handler
│
├── dashboard/                         # Protected dashboard routes
│   ├── layout.tsx                     # Dashboard layout with navigation
│   ├── page.tsx                       # Dashboard home
│   ├── loading.tsx                    # Dashboard loading state
│   ├── error.tsx                      # Dashboard error boundary
│   │
│   ├── presentations/
│   │   ├── page.tsx                   # Presentations list
│   │   ├── [id]/
│   │   │   ├── page.tsx               # Individual presentation view
│   │   │   ├── edit/
│   │   │   │   └── page.tsx           # Edit presentation
│   │   │   └── loading.tsx            # Presentation loading
│   │   └── new/
│   │       └── page.tsx               # Create new presentation
│   │
│   ├── settings/
│   │   ├── page.tsx                   # User settings
│   │   ├── account/
│   │   │   └── page.tsx               # Account settings
│   │   └── preferences/
│   │       └── page.tsx               # User preferences
│   │
│   └── sync/
│       ├── page.tsx                   # Sync status and controls
│       └── history/
│           └── page.tsx               # Sync history
│
├── api/                               # API routes (optional, coexist with Netlify)
│   ├── health/
│   │   └── route.ts                   # Health check endpoint
│   └── webhook/
│       └── route.ts                   # Webhook handlers
│
└── extension/                         # Extension integration routes
    ├── sidebar/
    │   └── page.tsx                   # Extension sidebar as web page
    └── popup/
        └── page.tsx                   # Extension popup as web page
```

### Core Layout Components
```typescript
// app/layout.tsx - Root layout with providers
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  title: 'Gamma Timetable',
  description: 'Transform Gamma presentations into synchronized timetables',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen bg-background font-sans antialiased">
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}

// app/providers.tsx - Client-side providers
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider } from 'react-redux'
import { ThemeProvider } from 'next-themes'
import { store } from '@store'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  )
}

// app/dashboard/layout.tsx - Dashboard layout
import { DashboardHeader } from '@ui/dashboard-header'
import { DashboardSidebar } from '@ui/dashboard-sidebar'
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-dashboard mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

---

## 🔄 State Management Architecture

### Redux Toolkit Store
```typescript
// packages/shared/store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

import authSlice from './slices/auth-slice'
import presentationsSlice from './slices/presentations-slice'
import syncSlice from './slices/sync-slice'
import uiSlice from './slices/ui-slice'

const persistConfig = {
  key: 'gamma-timetable',
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
}

const rootReducer = combineReducers({
  auth: authSlice,
  presentations: presentationsSlice,
  sync: syncSlice,
  ui: uiSlice,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Redux Slices
```typescript
// packages/shared/store/slices/auth-slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@clerk/nextjs'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  deviceId?: string
  pairingCode?: string
  devicePaired: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  devicePaired: false,
}

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: { email: string; password: string }) => {
    // Clerk authentication logic
    const response = await clerk.signIn.create(credentials)
    return response.user
  }
)

export const registerDevice = createAsyncThunk(
  'auth/registerDevice',
  async () => {
    const response = await fetch('/api/devices/register', {
      method: 'POST',
    })
    return response.json()
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload
    },
    setPairingCode: (state, action: PayloadAction<string>) => {
      state.pairingCode = action.payload
    },
    setDevicePaired: (state, action: PayloadAction<boolean>) => {
      state.devicePaired = action.payload
    },
    signOut: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.devicePaired = false
      state.deviceId = undefined
      state.pairingCode = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.isLoading = false
      })
      .addCase(signIn.rejected, (state) => {
        state.isLoading = false
      })
  },
})

export const { setUser, setDeviceId, setPairingCode, setDevicePaired, signOut } = authSlice.actions
export default authSlice.reducer

// packages/shared/store/slices/presentations-slice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '@api/client'

interface PresentationsState {
  presentations: Presentation[]
  currentPresentation: Presentation | null
  isLoading: boolean
  error: string | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
}

export const fetchPresentations = createAsyncThunk(
  'presentations/fetchAll',
  async () => {
    const response = await apiClient.presentations.list()
    return response.presentations
  }
)

export const savePresentation = createAsyncThunk(
  'presentations/save',
  async (presentation: Presentation) => {
    const response = await apiClient.presentations.save(presentation)
    return response
  }
)

const presentationsSlice = createSlice({
  name: 'presentations',
  initialState: {
    presentations: [],
    currentPresentation: null,
    isLoading: false,
    error: null,
    syncStatus: 'idle',
  } as PresentationsState,
  reducers: {
    setCurrentPresentation: (state, action) => {
      state.currentPresentation = action.payload
    },
    updatePresentationDuration: (state, action) => {
      const { presentationId, slideId, duration } = action.payload
      const presentation = state.presentations.find(p => p.id === presentationId)
      if (presentation) {
        const slide = presentation.slides.find(s => s.id === slideId)
        if (slide) {
          slide.duration = duration
        }
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresentations.fulfilled, (state, action) => {
        state.presentations = action.payload
        state.isLoading = false
      })
      .addCase(savePresentation.fulfilled, (state, action) => {
        state.syncStatus = 'success'
      })
  },
})

export const { setCurrentPresentation, updatePresentationDuration, clearError } = presentationsSlice.actions
export default presentationsSlice.reducer
```

### React Query Hooks
```typescript
// packages/shared/hooks/use-presentations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@api/client'
import { useAuth } from './use-auth'

export function usePresentations() {
  const { isAuthenticated } = useAuth()
  
  return useQuery({
    queryKey: ['presentations'],
    queryFn: apiClient.presentations.list,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePresentation(id: string) {
  return useQuery({
    queryKey: ['presentation', id],
    queryFn: () => apiClient.presentations.get(id),
    enabled: !!id,
  })
}

export function useSavePresentation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.presentations.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] })
    },
    onError: (error) => {
      console.error('Failed to save presentation:', error)
    },
  })
}

export function useDeletePresentation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.presentations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] })
    },
  })
}

// packages/shared/hooks/use-auth.ts
import { useSelector, useDispatch } from 'react-redux'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { setUser, signOut } from '@store/slices/auth-slice'
import type { RootState } from '@store'

export function useAuth() {
  const dispatch = useDispatch()
  const { user, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  
  const authState = useSelector((state: RootState) => state.auth)
  
  useEffect(() => {
    if (isLoaded) {
      dispatch(setUser(user))
    }
  }, [user, isLoaded, dispatch])
  
  const handleSignOut = async () => {
    await clerkSignOut()
    dispatch(signOut())
  }
  
  return {
    ...authState,
    signOut: handleSignOut,
    isLoaded,
  }
}
```

---

## ⚛️ React Component Migration

### Component Migration Strategy
```typescript
// packages/shared/ui/migration-bridge.ts
import React from 'react'
import { createRoot, Root } from 'react-dom/client'

interface MigrationBridge {
  vanilla: (props: any, container?: HTMLElement) => HTMLElement
  react: React.ComponentType<any>
  renderReact: (props: any, container: HTMLElement) => Root
}

export function createMigrationBridge<P = any>(
  vanillaComponent: (props: P) => HTMLElement,
  reactComponent: React.ComponentType<P>
): MigrationBridge {
  return {
    vanilla: vanillaComponent,
    react: reactComponent,
    renderReact: (props: P, container: HTMLElement) => {
      const root = createRoot(container)
      root.render(React.createElement(reactComponent, props))
      return root
    }
  }
}

// Usage example for gradual migration
export function useComponentRenderer() {
  const useReact = process.env.NODE_ENV === 'development' 
    ? process.env.USE_REACT_COMPONENTS === 'true'
    : true // Always use React in production
    
  return { useReact }
}
```

### Core React Components
```typescript
// packages/shared/ui/timetable-sidebar.tsx
import React from 'react'
import { useAuth } from '@hooks/use-auth'
import { usePresentations } from '@hooks/use-presentations'
import { TimetableItem, SyncControls, ExportControls } from './gamma-components'
import { LoadingSpinner } from './loading-spinner'
import { ErrorBoundary } from 'react-error-boundary'

interface TimetableSidebarProps {
  className?: string
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void
}

export function TimetableSidebar({ className, onExport }: TimetableSidebarProps) {
  const { isAuthenticated, user } = useAuth()
  const { data: presentations, isLoading, error } = usePresentations()
  
  if (isLoading) {
    return (
      <div className="sidebar-container">
        <div className="sidebar-header">
          <LoadingSpinner />
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <ErrorBoundary fallback={<div>Error loading presentations</div>}>
        <div>Failed to load presentations</div>
      </ErrorBoundary>
    )
  }
  
  return (
    <div className={cn("sidebar-container", className)}>
      <div className="sidebar-header">
        <h1 className="text-xl font-bold text-gray-900">Gamma Timetable</h1>
        {isAuthenticated && user && (
          <div className="text-sm text-gray-600">
            Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </div>
        )}
      </div>
      
      <div className="sidebar-content">
        {presentations?.map((presentation) => (
          <TimetableItem
            key={presentation.id}
            title={presentation.title}
            duration={presentation.duration}
            startTime={presentation.startTime}
            endTime={presentation.endTime}
            onDurationChange={(duration) => {
              // Optimistic update with Redux action
              // dispatch(updatePresentationDuration({ presentationId: presentation.id, duration }))
            }}
          />
        ))}
      </div>
      
      <div className="sidebar-footer">
        <SyncControls
          isAuthenticated={isAuthenticated}
          isSyncing={false} // From sync state
          autoSync={true} // From settings state
          onSaveToCloud={() => {}}
          onLoadFromCloud={() => {}}
          onToggleAutoSync={() => {}}
        />
        
        <ExportControls
          onExportCsv={() => onExport?.('csv')}
          onExportExcel={() => onExport?.('excel')}
          onExportPdf={() => onExport?.('pdf')}
        />
      </div>
    </div>
  )
}

// packages/shared/ui/dashboard-presentation-grid.tsx
import React from 'react'
import { usePresentations, useDeletePresentation } from '@hooks/use-presentations'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
import Link from 'next/link'

export function DashboardPresentationGrid() {
  const { data: presentations, isLoading } = usePresentations()
  const deletePresentation = useDeletePresentation()
  
  if (isLoading) {
    return <PresentationGridSkeleton />
  }
  
  return (
    <div className="grid grid-cols-auto-fit-300 gap-6">
      {presentations?.map((presentation) => (
        <Card key={presentation.id} className="slide-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{presentation.title}</span>
              <Badge variant="secondary">
                {presentation.slides?.length || 0} slides
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-4">
              Last updated: {new Date(presentation.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="default">
                <Link href={`/dashboard/presentations/${presentation.id}`}>
                  View
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/presentations/${presentation.id}/edit`}>
                  Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deletePresentation.mutate(presentation.id)}
                disabled={deletePresentation.isPending}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 🚀 Performance Optimizations

### Code Splitting & Lazy Loading
```typescript
// app/dashboard/presentations/[id]/page.tsx
import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@ui/loading-spinner'

// Lazy load heavy components
const PresentationEditor = dynamic(
  () => import('@ui/presentation-editor').then(mod => ({ default: mod.PresentationEditor })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Disable SSR for client-only components
  }
)

const TimetableChart = dynamic(
  () => import('@ui/timetable-chart'),
  { ssr: false }
)

export default function PresentationPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <PresentationEditor presentationId={params.id} />
      <TimetableChart presentationId={params.id} />
    </div>
  )
}
```

### React 18 Optimizations
```typescript
// packages/shared/hooks/use-optimistic-updates.ts
import { useOptimistic, useTransition } from 'react'
import { useSavePresentation } from './use-presentations'

export function useOptimisticPresentation(presentation: Presentation) {
  const [isPending, startTransition] = useTransition()
  const savePresentation = useSavePresentation()
  
  const [optimisticPresentation, addOptimisticUpdate] = useOptimistic(
    presentation,
    (currentPresentation, newData: Partial<Presentation>) => ({
      ...currentPresentation,
      ...newData,
    })
  )
  
  const updatePresentation = (updates: Partial<Presentation>) => {
    startTransition(() => {
      addOptimisticUpdate(updates)
      savePresentation.mutate({ ...presentation, ...updates })
    })
  }
  
  return {
    presentation: optimisticPresentation,
    updatePresentation,
    isPending,
  }
}

// packages/shared/ui/virtual-presentation-list.tsx
import { FixedSizeList as List } from 'react-window'
import { TimetableItem } from './gamma-components'

interface VirtualPresentationListProps {
  presentations: Presentation[]
  height: number
  itemHeight: number
}

export function VirtualPresentationList({
  presentations,
  height,
  itemHeight
}: VirtualPresentationListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TimetableItem {...presentations[index]} />
    </div>
  )
  
  return (
    <List
      height={height}
      itemCount={presentations.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

---

## 🔗 Extension Integration

### Chrome Extension React Bridge
```typescript
// packages/extension/src/react-integration.ts
import { createRoot, Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store } from '@store'
import { TimetableSidebar } from '@ui/timetable-sidebar'

export class ExtensionReactBridge {
  private root: Root | null = null
  private queryClient: QueryClient
  
  constructor() {
    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, staleTime: 30000 }
      }
    })
  }
  
  initialize(container: HTMLElement) {
    if (this.root) return
    
    this.root = createRoot(container)
    this.render()
  }
  
  private render() {
    if (!this.root) return
    
    this.root.render(
      <Provider store={store}>
        <QueryClientProvider client={this.queryClient}>
          <TimetableSidebar />
        </QueryClientProvider>
      </Provider>
    )
  }
  
  destroy() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
  }
  
  update(newProps: any) {
    // Update component props if needed
    this.render()
  }
}

// packages/extension/src/sidebar/sidebar-react.ts
import { ExtensionReactBridge } from '../react-integration'

let reactBridge: ExtensionReactBridge | null = null

export function initializeSidebar(container: HTMLElement) {
  // Check if React components should be used
  const useReact = chrome.storage.local.get(['useReactComponents'])
    .then(result => result.useReactComponents !== false)
  
  if (useReact) {
    reactBridge = new ExtensionReactBridge()
    reactBridge.initialize(container)
  } else {
    // Fall back to vanilla JS implementation
    initializeVanillaSidebar(container)
  }
}

export function destroySidebar() {
  if (reactBridge) {
    reactBridge.destroy()
    reactBridge = null
  }
}
```

### Web App as Extension Alternative
```typescript
// app/extension/sidebar/page.tsx - Web-based extension sidebar
'use client'

import { useEffect, useState } from 'react'
import { TimetableSidebar } from '@ui/timetable-sidebar'
import { useAuth } from '@hooks/use-auth'

export default function ExtensionSidebarPage() {
  const [gammaData, setGammaData] = useState(null)
  const { isAuthenticated } = useAuth()
  
  useEffect(() => {
    // Listen for messages from parent window (Gamma app)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://gamma.app') {
        setGammaData(event.data)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  return (
    <div className="w-full h-screen">
      <TimetableSidebar />
    </div>
  )
}
```

---

## 📊 Testing Strategy

### React Testing Library Setup
```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

configure({
  testIdAttribute: 'data-testid',
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// tests/utils/test-providers.tsx
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import authSlice from '@store/slices/auth-slice'

const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: { auth: authSlice },
    preloadedState,
  })
}

const AllTheProviders = ({ children, store }: any) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  )
}

const customRender = (
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: any = {}
) => {
  return render(ui, {
    wrapper: (props) => <AllTheProviders store={store} {...props} />,
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }
```

### Component Tests
```typescript
// packages/shared/ui/__tests__/timetable-item.test.tsx
import { render, screen, fireEvent } from '../../tests/utils/test-providers'
import { TimetableItem } from '../gamma-components'

describe('TimetableItem', () => {
  const defaultProps = {
    title: 'Test Slide',
    duration: 5,
    onDurationChange: jest.fn(),
  }
  
  it('renders slide title correctly', () => {
    render(<TimetableItem {...defaultProps} />)
    expect(screen.getByText('Test Slide')).toBeInTheDocument()
  })
  
  it('calls onDurationChange when slider is moved', () => {
    const onDurationChange = jest.fn()
    render(<TimetableItem {...defaultProps} onDurationChange={onDurationChange} />)
    
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '10' } })
    
    expect(onDurationChange).toHaveBeenCalledWith(10)
  })
  
  it('displays start and end times when provided', () => {
    render(
      <TimetableItem
        {...defaultProps}
        startTime="10:00"
        endTime="10:05"
      />
    )
    
    expect(screen.getByText(/Start: 10:00/)).toBeInTheDocument()
    expect(screen.getByText(/End: 10:05/)).toBeInTheDocument()
  })
})
```

---

## 🎯 Success Metrics & Validation

### Performance Benchmarks
```typescript
// tests/performance/react-migration-metrics.test.ts
import { performance } from 'perf_hooks'

describe('React Migration Performance', () => {
  it('should render TimetableItem faster than 100ms', async () => {
    const startTime = performance.now()
    
    render(<TimetableItem title="Test" duration={5} onDurationChange={() => {}} />)
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(100) // 100ms threshold
  })
  
  it('should handle 100 presentation items without performance degradation', () => {
    const presentations = Array.from({ length: 100 }, (_, i) => ({
      id: `pres-${i}`,
      title: `Presentation ${i}`,
      duration: 5 + (i % 10),
    }))
    
    const startTime = performance.now()
    
    render(
      <div>
        {presentations.map(pres => (
          <TimetableItem
            key={pres.id}
            title={pres.title}
            duration={pres.duration}
            onDurationChange={() => {}}
          />
        ))}
      </div>
    )
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(1000) // 1 second threshold for 100 items
  })
})
```

### Quality Gates
```typescript
// tests/quality/type-coverage.test.ts
import { execSync } from 'child_process'

describe('TypeScript Coverage', () => {
  it('should have 100% TypeScript coverage in React components', () => {
    const result = execSync('npx type-coverage --at-least 100 --project next.tsconfig.json packages/shared/ui', 
      { encoding: 'utf-8' })
    
    expect(result).toContain('100.00%')
  })
})

// E2E Testing with Playwright
// tests/e2e/react-migration.spec.ts
import { test, expect } from '@playwright/test'

test.describe('React Migration E2E', () => {
  test('dashboard loads with React components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that React components are rendering
    await expect(page.locator('[data-testid="timetable-item"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-controls"]')).toBeVisible()
  })
  
  test('extension sidebar works with React components', async ({ page }) => {
    await page.goto('/extension/sidebar')
    
    // Verify React sidebar renders correctly
    await expect(page.locator('[data-testid="extension-sidebar"]')).toBeVisible()
    
    // Test interactive elements
    await page.click('[data-testid="sync-save-button"]')
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Saving...')
  })
})
```

---

## 📅 Implementation Timeline

### Week 1: Next.js Foundation (Days 1-5)
- [ ] Next.js 14 installation and configuration
- [ ] App Router structure setup
- [ ] Root layout with providers (Redux, React Query, Theme)
- [ ] Basic routing and navigation
- [ ] Build system integration with existing Vite setup

### Week 2: Component Migration (Days 6-10)
- [ ] Migrate TimetableItem, SyncControls, ExportControls to React
- [ ] Create Dashboard presentation grid
- [ ] Implement React-based extension sidebar
- [ ] Set up component testing with React Testing Library
- [ ] Performance optimization with React.memo and useMemo

### Week 3: State Management (Days 11-15)
- [ ] Redux Toolkit store implementation
- [ ] React Query hooks for API integration
- [ ] Optimistic updates with React 18 features
- [ ] State persistence and hydration
- [ ] Error boundaries and loading states

### Week 4: Production Ready (Days 16-20)
- [ ] Code splitting and lazy loading
- [ ] SEO optimization and meta tags
- [ ] Performance monitoring and analytics
- [ ] E2E testing and quality validation
- [ ] Production deployment and monitoring

---

**SPRINT 5 READY FOR EXECUTION**
**Foundation**: Sprint 4 React foundation provides complete starting point ✅
**Architecture**: Next.js 14 App Router with modern React patterns
**Timeline**: 4 weeks for complete modern React application
**Risk Level**: Low - building on proven shadcn/ui + Tailwind foundation