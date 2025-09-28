import { SWRConfiguration } from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('API Error')
  }
  return response.json()
}

export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 60 seconds
  errorRetryCount: 3,
  refreshInterval: 0, // Disable automatic refresh
}

// Cache key generators
export const cacheKeys = {
  presentations: {
    list: () => '/api/presentations/list',
    detail: (id: string) => `/api/presentations/${id}`,
  }
}

// Simple cache metrics
export const cacheMetrics = {
  recordHit: () => {
    // Simple logging for now
    console.log('Cache hit recorded')
  },
  recordMiss: () => {
    // Simple logging for now
    console.log('Cache miss recorded')
  }
}

export { fetcher }
