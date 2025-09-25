'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  Presentation,
  Trash2,
  Eye,
  Bookmark,
  UploadCloud
} from 'lucide-react'
// No overflow menu in list cards; keep actions minimal
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { TimetableCardProps } from '../types'
import { usePerformanceTracker, featureFlags } from '@/utils/performance'

function TimetableCardComponent({
  presentation,
  onView,
  onExport,
  onDelete
}: TimetableCardProps) {
  const { trackRender } = usePerformanceTracker('TimetableCard');

  // Track renders for performance monitoring
  React.useEffect(() => {
    if (featureFlags.isEnabled('performanceTracking')) {
      trackRender('component rendered');
    }
  });
  // Memoize expensive formatting functions to prevent recalculation on every render
  const formatDuration = React.useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
  }, []);

  const formatDurationCompact = React.useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}m` : `${h}h`
  }, []);

  const formatUpdatedCompact = React.useCallback((date: Date) => {
    const diffMs = Date.now() - date.getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }, []);

  // Memoize event handlers to prevent child re-renders
  const handleCardClick = React.useCallback(() => {
    onView(presentation.id)
  }, [onView, presentation.id]);

  const handleViewClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onView(presentation.id)
  }, [onView, presentation.id]);

  // Export action is not shown in list card footer per UX guideline (max 1-2 actions; list uses primary only)

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(presentation.id)
  }, [onDelete, presentation.id]);

  // Memoize computed values that depend on presentation data
  const formattedDuration = React.useMemo(
    () => formatDurationCompact(presentation.totalDuration),
    [presentation.totalDuration, formatDurationCompact]
  );

  const formattedUpdated = React.useMemo(
    () => formatUpdatedCompact(new Date(presentation.updatedAt)),
    [presentation.updatedAt, formatUpdatedCompact]
  );

  const formattedDistanceToNow = React.useMemo(
    () => formatDistanceToNow(new Date(presentation.updatedAt), { addSuffix: true }),
    [presentation.updatedAt]
  );

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 border hover:shadow-md flex h-full flex-col"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Title row */}
        <div className="flex items-start gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Bookmark className="h-4 w-4" />
          </div>
          <h3 className="flex-1 min-w-0 font-semibold text-lg text-foreground line-clamp-2">
            {presentation.title}
          </h3>
        </div>

        {/* Compact meta row: Updated • Duration • Starts at */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`Updated ${formattedDistanceToNow}`}>
            <UploadCloud className="h-3.5 w-3.5" />
            {formattedUpdated}
          </span>
          <span className="text-muted-foreground/70">•</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title="Total duration">
            <Clock className="h-3.5 w-3.5" />
            {formattedDuration}
          </span>
          <span className="text-muted-foreground/70">•</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title="Starts at">
            <Calendar className="h-3.5 w-3.5" />
            {presentation.startTime}
          </span>
        </div>

        {/* Slides summary row */}
        <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-2">
          <span>Total</span>
          <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-[10px] font-medium">
            {presentation.slideCount}
          </Badge>
          <span>slides</span>
        </div>
      </CardContent>

      <CardFooter className="px-2 py-2 bg-muted/40 border-t mt-auto">
        <div className="flex w-full items-center justify-end gap-2">
          {/* Primary action only in list view, aligned right */}
          <Button onClick={handleViewClick}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// Custom comparison function for React.memo to prevent unnecessary re-renders
const areEqual = (prevProps: TimetableCardProps, nextProps: TimetableCardProps) => {
  // If feature flag is disabled, always re-render
  if (!featureFlags.isEnabled('reactOptimizations')) {
    return false;
  }

  // Deep comparison of presentation object key properties
  const presentation = prevProps.presentation;
  const nextPresentation = nextProps.presentation;

  if (presentation.id !== nextPresentation.id) return false;
  if (presentation.title !== nextPresentation.title) return false;
  if (presentation.updatedAt !== nextPresentation.updatedAt) return false;
  if (presentation.totalDuration !== nextPresentation.totalDuration) return false;
  if (presentation.slideCount !== nextPresentation.slideCount) return false;
  if (presentation.startTime !== nextPresentation.startTime) return false;

  // Function reference comparison (these should be memoized in parent)
  if (prevProps.onView !== nextProps.onView) return false;
  if (prevProps.onExport !== nextProps.onExport) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;

  return true;
};

// Export optimized component with React.memo
const TimetableCard = React.memo(TimetableCardComponent, areEqual);
TimetableCard.displayName = 'TimetableCard';

export default TimetableCard;
