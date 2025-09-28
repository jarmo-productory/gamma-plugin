'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import { StickyHeader } from '@/components/ui/sticky-header'
import { Button } from '@/components/ui/button'
import { usePerformanceTracker, featureFlags } from '@/utils/performance'
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
  FileSpreadsheet
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
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const router = useRouter()
  const { trackRender } = usePerformanceTracker('TimetableDetailClient');

  // Cleanup timeout refs
  const savedMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track renders for performance monitoring
  React.useEffect(() => {
    if (featureFlags.isEnabled('performanceTracking')) {
      trackRender('component rendered');
    }
  });

  // Memoize fetch function to prevent unnecessary re-creation
  const fetchPresentation = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/presentations/${presentationId}`)
      const data = await response.json()

      if (data.success && data.presentation) {
        setPresentation(data.presentation)
      } else {
        console.error('Failed to fetch presentation:', data.error)
        toast.error('Failed to load presentation')
        // Navigate back to timetables if presentation not found
        router.push('/gamma/timetables')
      }
    } catch (error) {
      console.error('Error fetching presentation:', error)
      toast.error('Failed to load presentation')
      router.push('/gamma/timetables')
    } finally {
      setLoading(false)
    }
  }, [presentationId, router]);

  // Fetch presentation data on component mount
  useEffect(() => {
    fetchPresentation()
  }, [fetchPresentation])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (savedMessageTimeoutRef.current) {
        clearTimeout(savedMessageTimeoutRef.current)
      }
    }
  }, [])

  // Memoize save handler to prevent recreation on every render
  const handleSave = useCallback(async (updatedPresentation: PresentationType) => {
    try {
      setSaving(true)
      
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

      const data = await response.json()

      if (data.success) {
        // Prefer optimistic local state to avoid reverting UI with any stale server echo.
        // Merge authoritative fields from server (timestamps) when available.
        const merged = {
          ...(presentation ?? {}),
          ...updatedPresentation,
          // Ensure slideCount and totals reflect edited data
          slideCount: updatedPresentation.timetableData.items.length,
          totalDuration: updatedPresentation.totalDuration,
          startTime: updatedPresentation.startTime,
          // Prefer server updatedAt if provided
          updatedAt: data.presentation?.updatedAt ?? (presentation?.updatedAt ?? new Date().toISOString()),
          // Bump a revision to force child sync where needed
          _revision: Date.now(),
        } as PresentationType & { _revision: number }

        setPresentation(merged)
        toast.success('Timetable updated successfully')
        
        // Show saved message and hide after 3 seconds
        setShowSavedMessage(true)
        if (savedMessageTimeoutRef.current) {
          clearTimeout(savedMessageTimeoutRef.current)
        }
        savedMessageTimeoutRef.current = setTimeout(() => setShowSavedMessage(false), 3000)
      } else {
        console.error('Save failed:', data.error)
        toast.error('Failed to save changes')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [presentation]);

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

  if (loading) {
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
        />
      </div>
    </AppLayout>
  )
}
