'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import AppLayout from '@/components/layouts/AppLayout'
import { StickyHeader } from '@/components/ui/sticky-header'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import TimetableGrid from './components/TimetableGrid'
import { Presentation } from './types'
import { usePerformanceTracker, featureFlags } from '@/utils/performance'
import { swrConfig, cacheKeys, cacheMetrics } from '@/lib/swr-config'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { exportToCSV } from './utils/export'

interface TimetablesClientProps {
  user: {
    email?: string
    name?: string
  }
}

export default function TimetablesClient({ user }: TimetablesClientProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null)
  const router = useRouter()
  const { trackRender } = usePerformanceTracker('TimetablesClient');

  // SWR data fetching with cache configuration
  const cacheKey = cacheKeys.presentations.list()
  const { data, error, isLoading, mutate: mutatePresentations } = useSWR(
    cacheKey,
    swrConfig.fetcher!,
    {
      ...swrConfig,
      onSuccess: (data) => {
        // Track cache hit for performance monitoring
        cacheMetrics.recordHit()
        if (featureFlags.isEnabled('performanceTracking')) {
          trackRender('data loaded from cache/server');
        }
      },
      onError: (error) => {
        // Track cache miss for performance monitoring
        cacheMetrics.recordMiss()
        console.error('SWR error fetching presentations:', error)
        toast.error('Failed to load timetables')
      }
    }
  )

  // Extract presentations from SWR response
  const presentations = useMemo(() => {
    return data?.success ? data.presentations : []
  }, [data])

  // Track renders for performance monitoring
  React.useEffect(() => {
    if (featureFlags.isEnabled('performanceTracking')) {
      trackRender('component rendered');
    }
  });

  // Memoize event handlers to prevent child re-renders
  const handleView = useCallback((id: string) => {
    // Navigate to the detailed view
    router.push(`/gamma/timetables/${id}`)
  }, [router]);

  const handleExport = useCallback(async (id: string) => {
    try {
      const presentation = presentations.find((p: Presentation) => p.id === id)
      if (!presentation) return

      // Export as CSV
      exportToCSV(presentation)
      toast.success(`Timetable exported as CSV: ${presentation.title}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }, [presentations]);

  const handleDeleteClick = useCallback((id: string) => {
    setPresentationToDelete(id)
    setDeleteDialogOpen(true)
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!presentationToDelete) return

    try {
      // Optimistic update: immediately remove from cache
      const currentData = data
      const optimisticPresentations = presentations.filter((p: Presentation) => p.id !== presentationToDelete)

      // Update cache optimistically
      mutatePresentations(
        currentData ? {
          ...currentData,
          presentations: optimisticPresentations,
          count: optimisticPresentations.length
        } : undefined,
        false // Don't revalidate immediately
      )

      const response = await fetch(`/api/presentations/${presentationToDelete}`, {
        method: 'DELETE'
      })

      const responseData = await response.json()

      if (responseData.success) {
        // Mutation was successful, keep the optimistic update
        toast.success('Timetable deleted successfully')

        // Revalidate to ensure server state is in sync
        mutatePresentations()
      } else {
        // Revert optimistic update on failure
        mutatePresentations(currentData)
        console.error('Delete failed:', responseData.error)
        toast.error('Failed to delete timetable')
      }
    } catch (error) {
      // Revert optimistic update on error
      mutatePresentations(data)
      console.error('Delete error:', error)
      toast.error('Failed to delete timetable')
    } finally {
      setDeleteDialogOpen(false)
      setPresentationToDelete(null)
    }
  }, [presentationToDelete, data, presentations, mutatePresentations]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false)
    setPresentationToDelete(null)
  }, []);

  // Memoize the presentation to delete for dialog display
  const presentationToDeleteData = useMemo(() => {
    return presentationToDelete ? presentations.find((p: Presentation) => p.id === presentationToDelete) : null;
  }, [presentationToDelete, presentations]);

  return (
    <AppLayout user={user}>
      <StickyHeader>
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Timetables</h1>
        </div>
      </StickyHeader>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TimetableGrid
          presentations={presentations}
          loading={isLoading}
          onView={handleView}
          onExport={handleExport}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this timetable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}