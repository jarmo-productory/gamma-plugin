'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  count?: number
}

export default function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              {/* Icon Skeleton */}
              <div className="flex-shrink-0">
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              
              {/* Content Skeleton */}
              <div className="flex-1 space-y-3">
                {/* Title */}
                <Skeleton className="h-5 w-3/4" />
                
                {/* Updated time */}
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                
                {/* Slide count and duration */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                
                {/* Start time badge */}
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between w-full">
              <Skeleton className="h-8 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </>
  )
}