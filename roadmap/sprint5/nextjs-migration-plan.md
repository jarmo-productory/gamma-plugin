# Next.js Migration Implementation Plan

**Date**: 2025-08-16  
**Purpose**: Comprehensive week-by-week implementation plan for migrating from vanilla JS to Next.js with React  
**Sprint**: 5 (Next.js + React Migration)

## Executive Summary

Based on the **complete React foundation implemented in Sprint 4** and detailed AS-IS analysis of our vanilla JavaScript web application, this plan provides specific file-by-file migration steps to transform our current h() helper-based SPA into a modern Next.js application while preserving all existing functionality.

**Foundation Ready**: React 18, shadcn/ui components, Tailwind CSS, and TypeScript are already configured and operational.

## Implementation Overview

### Current State Analysis
- **Web App**: Single-page vanilla JS with h() helper (522 lines in main-clerk-sdk.js)
- **Shared Components**: React components ready (`TimetableItem`, `SyncControls`, `ExportControls`)
- **Backend**: 11 operational Netlify Functions with comprehensive API coverage
- **Build System**: Vite with React plugin, PostCSS, and Tailwind already configured

### Target Architecture
- **Next.js App Router**: TypeScript-first with modern routing and layouts
- **Redux Toolkit**: Centralized state management replacing localStorage patterns
- **React Query**: API state management connecting to existing Netlify Functions
- **Preserved Features**: Modal authentication, device pairing, professional UX

---

## Week-by-Week Implementation Plan

## Week 1: Next.js Foundation & Core Setup

### Day 1-2: Next.js Installation & Configuration

#### Install Dependencies
```bash
# Next.js core with latest features
npm install next@latest react@latest react-dom@latest
npm install @reduxjs/toolkit react-redux @tanstack/react-query
npm install @clerk/nextjs  # Replace @clerk/clerk-js
npm install concurrently cross-env

# Development dependencies
npm install @types/node eslint-config-next
```

#### Create Next.js Configuration
**File**: `packages/web/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo transpilation
  transpilePackages: ['@shared', '@ui'],
  
  // Custom webpack for path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../shared'),
      '@ui': path.resolve(__dirname, '../shared/ui'),
      '@lib': path.resolve(__dirname, '../shared/lib'),
    }
    return config
  },
  
  // Environment configuration
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  
  // Output configuration for Netlify
  output: 'standalone',
  trailingSlash: true,
}

module.exports = nextConfig
```

#### App Router Structure Setup
**Create directory structure**:
```bash
mkdir -p packages/web/app
mkdir -p packages/web/app/(auth)
mkdir -p packages/web/app/dashboard
mkdir -p packages/web/app/device-pairing
mkdir -p packages/web/lib
mkdir -p packages/web/components
mkdir -p packages/web/store
mkdir -p packages/web/hooks
```

### Day 3: Redux Toolkit Store Configuration

#### Create Redux Store Structure
**File**: `packages/web/store/index.ts`
```typescript
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './slices/authSlice'
import { presentationsSlice } from './slices/presentationsSlice'
import { syncSlice } from './slices/syncSlice'
import { uiSlice } from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    presentations: presentationsSlice.reducer,
    sync: syncSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

#### Auth Slice Implementation
**File**: `packages/web/store/slices/authSlice.ts`
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { User } from '@clerk/nextjs'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  deviceId: string | null
  deviceToken: string | null
  isLoading: boolean
  error: string | null
  sessionStatus: 'idle' | 'loading' | 'restored' | 'failed'
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  deviceId: null,
  deviceToken: null,
  isLoading: false,
  error: null,
  sessionStatus: 'idle',
}

// Async thunks for authentication actions
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    // Migration from getCurrentUser() logic in main-clerk-sdk.js
    // Integrate with Clerk session restoration
  }
)

export const linkDevice = createAsyncThunk(
  'auth/linkDevice',
  async ({ pairingCode, sessionToken }: { pairingCode: string, sessionToken: string }) => {
    // Migration from handleDevicePairing() logic
    const response = await fetch('/api/devices/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ pairingCode })
    })
    return response.json()
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    clearAuth: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.deviceToken = null
      state.error = null
    },
    setError: (state, action) => {
      state.error = action.payload
      state.isLoading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true
        state.sessionStatus = 'loading'
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.sessionStatus = 'restored'
        state.user = action.payload
        state.isAuthenticated = !!action.payload
      })
      .addCase(linkDevice.fulfilled, (state, action) => {
        state.deviceToken = action.payload.deviceToken
        state.deviceId = action.payload.deviceId
      })
  },
})

export const { setUser, clearAuth, setError } = authSlice.actions
```

### Day 4-5: React Query Setup & API Integration

#### React Query Configuration
**File**: `packages/web/lib/react-query.ts`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
          // Don't retry auth errors
          if (error?.status === 401) return false
          return failureCount < 3
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// React Query Provider Component
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

#### API Client for Netlify Functions
**File**: `packages/web/lib/api-client.ts`
```typescript
import { useAuth } from '@clerk/nextjs'

class ApiClient {
  constructor(private baseUrl: string) {}

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Authenticated request wrapper
  async authenticatedRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const { getToken } = useAuth()
    const token = await getToken()
    
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL || '')

// Presentation API methods
export const presentationApi = {
  save: (data: { presentationUrl: string; title: string; timetableData: any }) =>
    apiClient.authenticatedRequest('/api/presentations/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  get: (presentationUrl: string) =>
    apiClient.authenticatedRequest(`/api/presentations/get?url=${encodeURIComponent(presentationUrl)}`),
    
  list: (params?: { limit?: number; offset?: number; sortBy?: string }) => {
    const searchParams = new URLSearchParams(params as Record<string, string>)
    return apiClient.authenticatedRequest(`/api/presentations/list?${searchParams}`)
  },
}

// Device API methods  
export const deviceApi = {
  register: () => apiClient.request('/api/devices/register', { method: 'POST' }),
  
  link: (pairingCode: string) =>
    apiClient.authenticatedRequest('/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ pairingCode }),
    }),
    
  exchange: (deviceId: string) =>
    apiClient.request('/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),
}
```

#### React Query Hooks
**File**: `packages/web/hooks/useApi.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presentationApi, deviceApi } from '@/lib/api-client'

// Presentation hooks
export function usePresentations() {
  return useQuery({
    queryKey: ['presentations'],
    queryFn: () => presentationApi.list(),
  })
}

export function usePresentation(presentationUrl: string) {
  return useQuery({
    queryKey: ['presentation', presentationUrl],
    queryFn: () => presentationApi.get(presentationUrl),
    enabled: !!presentationUrl,
  })
}

export function useSavePresentation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: presentationApi.save,
    onSuccess: () => {
      // Invalidate presentations list
      queryClient.invalidateQueries({ queryKey: ['presentations'] })
    },
  })
}

// Device pairing hooks
export function useDeviceRegistration() {
  return useMutation({
    mutationFn: deviceApi.register,
  })
}

export function useDeviceLinking() {
  return useMutation({
    mutationFn: deviceApi.link,
  })
}

// Combined hook for device pairing flow
export function useDevicePairing() {
  const registerDevice = useDeviceRegistration()
  const linkDevice = useDeviceLinking()
  
  const startPairing = async () => {
    const registration = await registerDevice.mutateAsync()
    return registration
  }
  
  const completePairing = async (pairingCode: string) => {
    const result = await linkDevice.mutateAsync(pairingCode)
    return result
  }
  
  return {
    startPairing,
    completePairing,
    isLoading: registerDevice.isPending || linkDevice.isPending,
    error: registerDevice.error || linkDevice.error,
  }
}
```

---

## Week 2: Component Migration & Page Structure

### Day 1-2: Layout Components & Root Layout

#### Root Layout Implementation
**File**: `packages/web/app/layout.tsx`
```tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gamma Timetable - Cloud Sync Dashboard',
  description: 'Manage your Gamma presentation timetables with cloud synchronization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
        },
      }}
    >
      <html lang="en" className={inter.className}>
        <body className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Providers>
            <main className="min-h-screen">
              {children}
            </main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

#### Providers Setup
**File**: `packages/web/app/providers.tsx`
```tsx
'use client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { QueryProvider } from '@/lib/react-query'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryProvider>
        {children}
      </QueryProvider>
    </Provider>
  )
}
```

### Day 3: Landing Page Migration

#### Landing Page Component
**File**: `packages/web/app/page.tsx`
```tsx
'use client'
import { useAuth, SignInButton } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { useDevicePairing } from '@/hooks/useApi'

export default function HomePage() {
  const { isSignedIn, user } = useAuth()
  const searchParams = useSearchParams()
  const pairingCode = searchParams.get('code')
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isSignedIn && !pairingCode) {
      window.location.href = '/dashboard'
    }
  }, [isSignedIn, pairingCode])

  // Handle device pairing flow
  if (pairingCode) {
    return <DevicePairingFlow pairingCode={pairingCode} />
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gamma Timetable
          </h1>
          <p className="text-xl text-gray-600">
            Cloud Sync Dashboard
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600 text-center">
              Sign in to access your synchronized presentation timetables across all your devices.
            </p>
            
            <SignInButton mode="modal">
              <Button className="w-full" size="lg">
                Sign In to Dashboard
              </Button>
            </SignInButton>
            
            <div className="text-sm text-gray-500 text-center">
              New to Gamma Timetable? Install our{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Chrome Extension
              </a>{' '}
              first.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Device pairing component (migrated from handleDevicePairing logic)
function DevicePairingFlow({ pairingCode }: { pairingCode: string }) {
  const { isSignedIn } = useAuth()
  const { completePairing, isLoading, error } = useDevicePairing()
  
  useEffect(() => {
    if (isSignedIn && pairingCode) {
      completePairing(pairingCode)
    }
  }, [isSignedIn, pairingCode, completePairing])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Device Pairing</CardTitle>
        </CardHeader>
        <CardContent>
          {!isSignedIn ? (
            <div className="space-y-4">
              <p>Please sign in to link your device:</p>
              <SignInButton mode="modal">
                <Button className="w-full">
                  Sign In to Link Device
                </Button>
              </SignInButton>
            </div>
          ) : isLoading ? (
            <div className="text-center">
              <p>Linking your device...</p>
            </div>
          ) : error ? (
            <div className="text-red-600">
              <p>Error linking device: {error.message}</p>
            </div>
          ) : (
            <div className="text-green-600 text-center">
              <p>Device linked successfully!</p>
              <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Day 4-5: Dashboard Migration

#### Dashboard Layout
**File**: `packages/web/app/dashboard/layout.tsx`
```tsx
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

#### Dashboard Main Page
**File**: `packages/web/app/dashboard/page.tsx`
```tsx
'use client'
import { useUser } from '@clerk/nextjs'
import { usePresentations } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { PresentationsList } from '@/components/PresentationsList'
import { SyncStatus } from '@/components/SyncStatus'

export default function DashboardPage() {
  const { user } = useUser()
  const { data: presentations, isLoading, error } = usePresentations()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your Gamma presentation timetables
          </p>
        </div>
        <SyncStatus />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">
              {presentations?.presentations?.length || 0}
            </div>
            <p className="text-gray-600">Total Presentations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">
              {presentations?.meta?.lastSyncTime ? '✓' : '○'}
            </div>
            <p className="text-gray-600">Sync Status</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-gray-600">Member Since</p>
          </CardContent>
        </Card>
      </div>

      {/* Presentations List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Presentations</CardTitle>
        </CardHeader>
        <CardContent>
          <PresentationsList 
            presentations={presentations?.presentations || []}
            isLoading={isLoading}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Week 3: Feature Migration & State Management

### Day 1-2: Presentations Management

#### Presentations List Component
**File**: `packages/web/components/PresentationsList.tsx`
```tsx
'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { useSavePresentation } from '@/hooks/useApi'
import { ExportControls } from '@ui/gamma-components'

interface Presentation {
  id: string
  presentationUrl: string
  title: string
  updatedAt: string
  timetableData?: {
    items: Array<{
      id: string
      title: string
      duration: number
    }>
  }
}

interface PresentationsListProps {
  presentations: Presentation[]
  isLoading: boolean
  error: any
}

export function PresentationsList({ presentations, isLoading, error }: PresentationsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'updated'>('updated')
  
  const filteredPresentations = presentations
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 text-center">
        Error loading presentations: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search presentations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as 'title' | 'updated')}
          className="px-3 py-2 border rounded-md"
        >
          <option value="updated">Sort by Updated</option>
          <option value="title">Sort by Title</option>
        </select>
      </div>

      {/* Presentations Grid */}
      {filteredPresentations.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          {searchTerm ? 'No presentations match your search' : 'No presentations yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresentations.map(presentation => (
            <PresentationCard key={presentation.id} presentation={presentation} />
          ))}
        </div>
      )}
    </div>
  )
}

function PresentationCard({ presentation }: { presentation: Presentation }) {
  const itemCount = presentation.timetableData?.items?.length || 0
  const totalDuration = presentation.timetableData?.items?.reduce(
    (sum, item) => sum + item.duration, 0
  ) || 0

  const handleExportCsv = () => {
    // Implementation for CSV export
    console.log('Export CSV for', presentation.id)
  }

  const handleExportExcel = () => {
    // Implementation for Excel export  
    console.log('Export Excel for', presentation.id)
  }

  const handleExportPdf = () => {
    // Implementation for PDF export
    console.log('Export PDF for', presentation.id)
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{presentation.title}</CardTitle>
        <p className="text-sm text-gray-500">
          Updated {new Date(presentation.updatedAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Slides:</span>
            <span className="font-medium ml-1">{itemCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium ml-1">{totalDuration}m</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Edit
          </Button>
        </div>

        <ExportControls
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          className="mt-4"
        />
      </CardContent>
    </Card>
  )
}
```

### Day 3-4: Sync State Management

#### Sync Slice Implementation
**File**: `packages/web/store/slices/syncSlice.ts`
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { presentationApi } from '@/lib/api-client'

interface SyncState {
  isAutoSyncEnabled: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  syncError: string | null
  pendingOperations: number
}

const initialState: SyncState = {
  isAutoSyncEnabled: true,
  isSyncing: false,
  lastSyncTime: null,
  syncStatus: 'idle',
  syncError: null,
  pendingOperations: 0,
}

// Async thunks for sync operations
export const syncAllPresentations = createAsyncThunk(
  'sync/syncAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Fetch all presentations from cloud
      const cloudPresentations = await presentationApi.list()
      
      // Get local presentations from IndexedDB/localStorage
      const localPresentations = await getLocalPresentations()
      
      // Merge and resolve conflicts
      const mergedData = mergeAndResolveConflicts(localPresentations, cloudPresentations)
      
      // Save merged data back to cloud
      for (const presentation of mergedData) {
        await presentationApi.save(presentation)
      }
      
      return mergedData
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const syncPresentation = createAsyncThunk(
  'sync/syncPresentation',
  async ({ presentationUrl, timetableData }: { presentationUrl: string, timetableData: any }) => {
    return await presentationApi.save({
      presentationUrl,
      title: timetableData.title,
      timetableData
    })
  }
)

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    toggleAutoSync: (state) => {
      state.isAutoSyncEnabled = !state.isAutoSyncEnabled
    },
    setSyncStatus: (state, action) => {
      state.syncStatus = action.payload
    },
    incrementPendingOperations: (state) => {
      state.pendingOperations += 1
    },
    decrementPendingOperations: (state) => {
      state.pendingOperations = Math.max(0, state.pendingOperations - 1)
    },
    clearSyncError: (state) => {
      state.syncError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncAllPresentations.pending, (state) => {
        state.isSyncing = true
        state.syncStatus = 'syncing'
        state.syncError = null
      })
      .addCase(syncAllPresentations.fulfilled, (state, action) => {
        state.isSyncing = false
        state.syncStatus = 'success'
        state.lastSyncTime = new Date().toISOString()
      })
      .addCase(syncAllPresentations.rejected, (state, action) => {
        state.isSyncing = false
        state.syncStatus = 'error'
        state.syncError = action.payload as string
      })
      .addCase(syncPresentation.fulfilled, (state) => {
        state.lastSyncTime = new Date().toISOString()
      })
  },
})

export const { 
  toggleAutoSync, 
  setSyncStatus, 
  incrementPendingOperations, 
  decrementPendingOperations,
  clearSyncError 
} = syncSlice.actions

// Helper functions for local data management
async function getLocalPresentations() {
  // Implementation for getting local presentations from IndexedDB
  // Migration from packages/shared/storage patterns
  return []
}

function mergeAndResolveConflicts(local: any[], cloud: any[]) {
  // Implementation for conflict resolution based on timestamps
  // Migration from existing conflict resolution logic
  return cloud // Simplified - last-write-wins
}
```

### Day 5: Sync Status Component

#### Sync Status Component
**File**: `packages/web/components/SyncStatus.tsx`
```tsx
'use client'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { syncAllPresentations, toggleAutoSync } from '@/store/slices/syncSlice'
import { SyncControls } from '@ui/gamma-components'
import { Button } from '@ui/button'

export function SyncStatus() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const { 
    isSyncing, 
    isAutoSyncEnabled, 
    syncStatus, 
    lastSyncTime,
    syncError 
  } = useSelector((state: RootState) => state.sync)

  const handleSaveToCloud = () => {
    dispatch(syncAllPresentations())
  }

  const handleLoadFromCloud = () => {
    dispatch(syncAllPresentations())
  }

  const handleToggleAutoSync = () => {
    dispatch(toggleAutoSync())
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex items-center gap-4">
      {/* Sync Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          syncStatus === 'success' ? 'bg-green-500' :
          syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
          syncStatus === 'error' ? 'bg-red-500' :
          'bg-gray-300'
        }`} />
        <span className="text-sm text-gray-600">
          {syncStatus === 'syncing' ? 'Syncing...' :
           syncStatus === 'success' ? 'Synced' :
           syncStatus === 'error' ? 'Sync Error' :
           'Ready'}
        </span>
      </div>

      {/* Last Sync Time */}
      {lastSyncTime && (
        <span className="text-xs text-gray-500">
          {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}

      {/* Sync Controls */}
      <SyncControls
        isAuthenticated={isAuthenticated}
        isSyncing={isSyncing}
        autoSync={isAutoSyncEnabled}
        onSaveToCloud={handleSaveToCloud}
        onLoadFromCloud={handleLoadFromCloud}
        onToggleAutoSync={handleToggleAutoSync}
      />

      {/* Sync Error Display */}
      {syncError && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={syncError}>
          {syncError}
        </div>
      )}
    </div>
  )
}
```

---

## Week 4: Enhancement & Optimization

### Day 1-2: Middleware & Authentication

#### Clerk Middleware Setup
**File**: `packages/web/middleware.ts`
```typescript
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ['/'],
  
  // Routes that require authentication
  protectedRoutes: ['/dashboard'],
  
  // Redirect unauthenticated users trying to access protected routes
  afterAuth(auth, req) {
    // Handle device pairing flow
    if (req.nextUrl.searchParams.get('code') && !auth.userId) {
      return // Allow pairing flow to proceed
    }
    
    // Redirect unauthenticated users from protected routes
    if (!auth.userId && auth.isProtectedRoute) {
      const signInUrl = new URL('/', req.url)
      return Response.redirect(signInUrl)
    }
    
    // Redirect authenticated users from public routes to dashboard
    if (auth.userId && req.nextUrl.pathname === '/' && !req.nextUrl.searchParams.get('code')) {
      const dashboardUrl = new URL('/dashboard', req.url)
      return Response.redirect(dashboardUrl)
    }
  },
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

#### API Routes for Netlify Functions Proxy
**File**: `packages/web/app/api/[...proxy]/route.ts`
```typescript
import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'

const NETLIFY_FUNCTIONS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export async function GET(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return handleRequest(request, params.proxy, 'GET')
}

export async function POST(
  request: NextRequest, 
  { params }: { params: { proxy: string[] } }
) {
  return handleRequest(request, params.proxy, 'POST')
}

async function handleRequest(request: NextRequest, proxy: string[], method: string) {
  const { userId, getToken } = auth()
  const endpoint = proxy.join('/')
  
  // Build target URL
  const url = new URL(`/api/${endpoint}`, NETLIFY_FUNCTIONS_URL)
  url.search = request.nextUrl.search

  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Add authentication for protected endpoints
  if (endpoint.startsWith('presentations/') || endpoint.includes('protected')) {
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = await getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Forward request to Netlify function
  try {
    const body = method !== 'GET' ? await request.text() : undefined
    
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
```

### Day 3-4: Performance Optimization

#### Build Configuration Optimization
**File**: `packages/web/next.config.js` (Enhanced)
```javascript
const nextConfig = {
  // Monorepo transpilation
  transpilePackages: ['@shared', '@ui'],
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        )
      }
      return config
    },
  }),

  // Image optimization
  images: {
    domains: ['productory-powerups.netlify.app'],
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@ui', '@shared'],
  },
}
```

#### Error Boundaries Implementation
**File**: `packages/web/components/ErrorBoundary.tsx`
```tsx
'use client'
import { Component, ReactNode } from 'react'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm bg-gray-100 p-2 rounded">
                  <summary>Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} className="flex-1">
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Global error page
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-red-600">Application Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  A critical error occurred. Please try again.
                </p>
                <Button onClick={reset} className="w-full">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### Day 5: Testing & Documentation

#### Unit Tests Setup
**File**: `packages/web/jest.config.js`
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@ui/(.*)$': '<rootDir>/../shared/ui/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

---

## Implementation Commands & Scripts

### Package.json Scripts Update
```json
{
  "scripts": {
    "dev:web": "next dev",
    "dev:web:turbo": "next dev --turbo",
    "build:web": "next build",
    "start:web": "next start",
    "build:analyze": "ANALYZE=true next build",
    "test:web": "jest",
    "test:web:watch": "jest --watch",
    "test:web:coverage": "jest --coverage",
    "lint:web": "next lint",
    "type-check:web": "tsc --noEmit"
  }
}
```

### Development Workflow
```bash
# Week 1: Setup
npm install  # Install all new dependencies
npm run dev:web  # Start Next.js development server

# Week 2: Component migration
npm run build:web  # Test builds during migration
npm run lint:web   # Ensure code quality

# Week 3: Feature implementation  
npm run test:web:watch  # Run tests during development
npm run type-check:web  # TypeScript validation

# Week 4: Optimization
npm run build:analyze  # Analyze bundle size
npm run test:web:coverage  # Full test coverage
```

## Success Metrics & Validation

### Week 1 Validation
- [ ] Next.js app boots without errors
- [ ] Redux store configured with auth state
- [ ] React Query connects to existing Netlify Functions
- [ ] Clerk authentication modal working
- [ ] Path aliases resolve correctly

### Week 2 Validation  
- [ ] Landing page preserves authentication flow
- [ ] Device pairing flow functional
- [ ] Dashboard layout matches existing design
- [ ] Navigation between pages working
- [ ] Error boundaries catch render errors

### Week 3 Validation
- [ ] Presentations list displays correctly
- [ ] CRUD operations work with existing APIs
- [ ] Sync state management functional
- [ ] Export controls operational
- [ ] Real-time sync status working

### Week 4 Validation
- [ ] Authentication middleware protecting routes
- [ ] Performance optimized (< 3s load time)
- [ ] Error handling comprehensive
- [ ] Bundle size acceptable (< 500KB)
- [ ] All tests passing (> 90% coverage)

## Migration Completion Checklist

### Core Functionality Preserved
- [ ] ✅ Modal-based Clerk authentication (no redirects)
- [ ] ✅ Device pairing with extension
- [ ] ✅ Session persistence across reloads
- [ ] ✅ Professional UI design maintained
- [ ] ✅ All existing API integrations working

### New Features Added
- [ ] ✅ Proper Next.js routing with protected routes
- [ ] ✅ Redux Toolkit state management
- [ ] ✅ React Query for server state
- [ ] ✅ TypeScript throughout
- [ ] ✅ Component-based architecture
- [ ] ✅ Performance optimizations
- [ ] ✅ Comprehensive error handling

### Build System Integration
- [ ] ✅ Next.js builds integrate with existing monorepo
- [ ] ✅ Shared components work across extension and web
- [ ] ✅ Netlify Functions continue working as API backend
- [ ] ✅ Production deployment maintains dual-environment system
- [ ] ✅ Development workflow supports both extension and web development

**Timeline**: 4 weeks for complete migration with zero regression and enhanced functionality building on the proven React foundation from Sprint 4.