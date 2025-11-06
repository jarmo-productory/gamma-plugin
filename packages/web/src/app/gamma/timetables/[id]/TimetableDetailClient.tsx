'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import AppLayout from '@/components/layouts/AppLayout'
import { StickyHeader } from '@/components/ui/sticky-header'
import { Button } from '@/components/ui/button'
import { usePerformanceTracker, featureFlags } from '@/utils/performance'
import { swrConfig, cacheKeys, cacheMetrics } from '@/lib/swr-config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Presentation,
  Loader2,
  ChevronLeft,
  ExternalLink,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import { Presentation as PresentationType } from '../types'
import TimetableDetailView from './components/TimetableDetailView'
import { exportToEnhancedCSV, exportToXLSX } from './utils/exportEnhanced'

interface TimetableDetailClientProps {
  user: {
    email?: string
    name?: string
  }
  presentationId: string
}

export default function TimetableDetailClient({ user, presentationId }: TimetableDetailClientProps) {
  const [saving, setSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const router = useRouter()
  const { trackRender } = usePerformanceTracker('TimetableDetailClient');

  // Cleanup timeout refs
  const savedMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // SWR data fetching for presentation detail
  const cacheKey = cacheKeys.presentations.detail(presentationId)
  const { data, error, isLoading, mutate: mutatePresentation } = useSWR(
    cacheKey,
    swrConfig.fetcher!,
    {
      ...swrConfig,
      onSuccess: (data) => {
        // Track cache hit for performance monitoring
        cacheMetrics.recordHit()
        if (featureFlags.isEnabled('performanceTracking')) {
          trackRender('presentation data loaded from cache/server');
        }
      },
      onError: (error) => {
        // Track cache miss for performance monitoring
        cacheMetrics.recordMiss()
        console.error('SWR error fetching presentation:', error)
        toast.error('Failed to load presentation')
        // Navigate back to timetables if presentation not found
        router.push('/gamma/timetables')
      }
    }
  )

  // Extract presentation from SWR response
  const presentation = useMemo(() => {
    return data?.success ? data.presentation : null
  }, [data])

  // Track renders for performance monitoring
  React.useEffect(() => {
    if (featureFlags.isEnabled('performanceTracking')) {
      trackRender('component rendered');
    }
  });

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (savedMessageTimeoutRef.current) {
        clearTimeout(savedMessageTimeoutRef.current)
      }
    }
  }, [])

  // Memoize save handler with optimistic updates
  const handleSave = useCallback(async (updatedPresentation: PresentationType) => {
    try {
      setSaving(true)

      // Store current data for potential rollback
      const currentData = data

      // Optimistic update: immediately update cache with new data
      const optimisticResponse = {
        success: true,
        presentation: {
          ...(presentation ?? {}),
          ...updatedPresentation,
          // Ensure computed fields are updated
          slideCount: updatedPresentation.timetableData.items.length,
          totalDuration: updatedPresentation.totalDuration,
          startTime: updatedPresentation.startTime,
          updatedAt: new Date().toISOString(),
          _revision: Date.now(),
        } as PresentationType & { _revision: number }
      }

      // Update cache optimistically
      mutatePresentation(optimisticResponse, false)

      // Transform to API expected format - ONLY send fields that the schema expects
      const savePayload = {
        title: updatedPresentation.title,
        presentationUrl: updatedPresentation.presentationUrl, // Using deprecated camelCase format
        timetableData: {
          items: updatedPresentation.timetableData.items,
          startTime: updatedPresentation.timetableData.startTime,
          totalDuration: updatedPresentation.timetableData.totalDuration
        }
      }

      const response = await fetch('/api/presentations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savePayload),
      })

      const responseData = await response.json()

      if (responseData.success) {
        // Merge with server response and keep optimistic updates
        const serverMerged = {
          success: true,
          presentation: {
            ...optimisticResponse.presentation,
            // Use server timestamp if provided
            updatedAt: responseData.presentation?.updatedAt ?? optimisticResponse.presentation.updatedAt,
          }
        }

        // Update cache with server-confirmed data
        mutatePresentation(serverMerged, false)

        // Also update the presentations list cache to keep it in sync
        mutate(
          cacheKeys.presentations.list(),
          (listData: { success: boolean; presentations: PresentationType[] } | undefined) => {
            if (listData?.success && listData.presentations) {
              const updatedPresentations = listData.presentations.map((p: PresentationType) =>
                p.id === presentationId
                  ? {
                      ...p,
                      title: updatedPresentation.title,
                      startTime: updatedPresentation.startTime,
                      totalDuration: updatedPresentation.totalDuration,
                      slideCount: updatedPresentation.timetableData.items.length,
                      updatedAt: serverMerged.presentation.updatedAt,
                    }
                  : p
              )
              return { ...listData, presentations: updatedPresentations }
            }
            return listData
          },
          false
        )

        toast.success('Timetable updated successfully')

        // Show saved message and hide after 3 seconds
        setShowSavedMessage(true)
        if (savedMessageTimeoutRef.current) {
          clearTimeout(savedMessageTimeoutRef.current)
        }
        savedMessageTimeoutRef.current = setTimeout(() => setShowSavedMessage(false), 3000)
      } else {
        // Revert optimistic update on failure
        mutatePresentation(currentData)
        console.error('Save failed:', responseData.error)
        toast.error('Failed to save changes')
      }
    } catch (error) {
      // Revert optimistic update on error
      mutatePresentation(data)
      console.error('Save error:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [presentation, data, mutatePresentation, presentationId]);

  // Memoize navigation handler
  const handleBackToTimetables = useCallback(() => {
    router.push('/gamma/timetables')
  }, [router]);

  // Memoize export handlers to prevent recreation
  const handleExportCSV = useCallback(async () => {
    if (!presentation) return;
    try {
      await exportToEnhancedCSV(presentation)
      toast.success(`CSV exported: ${presentation.title}`)
    } catch (error) {
      console.error('CSV export error:', error)
      toast.error('Failed to export CSV')
    }
  }, [presentation]);

  const handleExportXLSX = useCallback(async () => {
    if (!presentation) return;
    try {
      await exportToXLSX(presentation)
      toast.success(`Excel file exported: ${presentation.title}`)
    } catch (error) {
      console.error('XLSX export error:', error)
      toast.error('Failed to export Excel file')
    }
  }, [presentation]);

  // Memoize presentation URL opener
  const handleViewOriginal = useCallback(() => {
    if (presentation?.presentationUrl) {
      window.open(presentation.presentationUrl, '_blank')
    }
  }, [presentation?.presentationUrl]);

  // Memoize computed values for better performance
  const hasValidPresentation = useMemo(() => Boolean(presentation), [presentation]);

  const presentationTitle = useMemo(() => presentation?.title || '', [presentation?.title]);

  const hasOriginalUrl = useMemo(
    () => Boolean(presentation?.presentationUrl),
    [presentation?.presentationUrl]
  );

  // Warn user before leaving with unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Memoize status indicator content
  const statusIndicatorContent = useMemo(() => {
    if (saving) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      );
    }
    if (showSavedMessage) {
      return <span className="text-green-600">All changes saved</span>;
    }
    return null;
  }, [saving, showSavedMessage]);

  if (isLoading) {
    return (
      <AppLayout user={user}>
        <StickyHeader>
          <div className="flex items-center gap-2 flex-1">
            <Presentation className="h-5 w-5" />
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToTimetables}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Timetables
              </Button>
              <span className="text-muted-foreground">/</span>
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </StickyHeader>
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading presentation...
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!presentation) {
    return (
      <AppLayout user={user}>
        <StickyHeader>
          <div className="flex items-center gap-2 flex-1">
            <Presentation className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Presentation Not Found</h1>
          </div>
        </StickyHeader>
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">The requested presentation could not be found.</p>
            <Button onClick={handleBackToTimetables}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Timetables
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user}>
      <StickyHeader>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToTimetables}
              className="text-muted-foreground hover:text-foreground text-lg"
            >
              <ChevronLeft className="h-4 w-4" />
              Timetables
            </Button>
            <span className="text-muted-foreground text-lg">/</span>
            <h1 className="text-lg font-semibold">{presentationTitle}</h1>
          </div>
        </div>
        
        {/* Consolidated Header Actions */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="text-sm">
            {statusIndicatorContent}
          </div>

          {/* Manual Save Button */}
          <Button
            onClick={() => presentation && handleSave(presentation)}
            disabled={saving || !hasUnsavedChanges}
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </>
            )}
          </Button>

          {/* View Original Button */}
          {hasOriginalUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewOriginal}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Original
            </Button>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-3" />
                <div className="flex flex-col">
                  <span className="font-medium">CSV Format</span>
                  <span className="text-xs text-muted-foreground">
                    Compatible with Excel, Google Sheets
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleExportXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-3" />
                <div className="flex flex-col">
                  <span className="font-medium">Excel Format</span>
                  <span className="text-xs text-muted-foreground">
                    Professional formatting, charts
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </StickyHeader>
      
      {/* Content - works with SidebarInset's flex structure */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <TimetableDetailView
          presentation={presentation}
          onSave={handleSave}
          saving={saving}
          onUnsavedChangesChange={setHasUnsavedChanges}
        />
      </div>
    </AppLayout>
  )
}
