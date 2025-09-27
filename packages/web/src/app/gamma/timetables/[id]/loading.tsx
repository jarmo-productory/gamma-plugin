import { Skeleton } from '@/components/ui/skeleton'

export default function TimetableDetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Actions section */}
      <div className="border border-border/60 rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border/60 rounded-lg p-4 bg-card">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Main content - timetable */}
      <div className="border border-border/60 rounded-lg bg-card">
        {/* Table header */}
        <div className="border-b border-border/60 p-4">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Table rows */}
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 items-center py-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-9 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  )
}