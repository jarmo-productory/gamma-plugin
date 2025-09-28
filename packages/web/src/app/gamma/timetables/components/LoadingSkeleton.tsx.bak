'use client'

import React, { memo } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  count?: number
}

// Memoized loading skeleton to prevent unnecessary re-renders
function LoadingSkeletonCard({ index }: { index: number }) {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon Skeleton - matches real TimetableCard dimensions */}
          <div className="flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>

          {/* Content Skeleton - matches real layout */}
          <div className="flex-1 space-y-2">
            {/* Title */}
            <Skeleton className="h-5 w-3/4" />

            {/* Compact meta row: Updated • Duration • Starts at */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-1 rounded-full" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-1 rounded-full" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Slide count badge */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-8 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-2 py-2 bg-muted/40 border-t">
        <div className="flex w-full items-center justify-end gap-2">
          {/* Primary action button skeleton */}
          <Skeleton className="h-9 w-16" />
        </div>
      </CardFooter>
    </Card>
  )
}

// Memoize individual skeleton cards
const MemoizedSkeletonCard = memo(LoadingSkeletonCard)

function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <MemoizedSkeletonCard key={`skeleton-${index}`} index={index} />))}
    </>
  )
}

// Export memoized component
export default memo(LoadingSkeleton)
