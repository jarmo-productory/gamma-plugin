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

export { fetcher }
