'use client'

import { memo, useMemo } from 'react'
import { Presentation } from '../types'
import TimetableCard from './TimetableCard'
import LoadingSkeleton from './LoadingSkeleton'
import EmptyState from './EmptyState'

interface TimetableGridProps {
  presentations: Presentation[]
  loading: boolean
  onView: (id: string) => void
  onExport: (id: string) => void
  onDelete: (id: string) => void
}

function TimetableGrid({
  presentations,
  loading,
  onView,
  onExport,
  onDelete
}: TimetableGridProps) {
  // Memoize the grid structure to prevent unnecessary re-computations
  const gridClasses = useMemo(
    () => "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
    []
  )
  if (loading) {
    return (
      <div className={gridClasses}>
        <LoadingSkeleton count={6} />
      </div>
    )
  }

  if (presentations.length === 0) {
    return <EmptyState />
  }

  return (
    <div className={gridClasses}>
      {presentations.map((presentation) => (
        <TimetableCard
          key={presentation.id}
          presentation={presentation}
          onView={onView}
          onExport={onExport}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// Memoize to prevent re-renders when parent re-renders unnecessarily
export default memo(TimetableGrid, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.presentations.length === nextProps.presentations.length &&
    prevProps.presentations.every(
      (prevPres, index) =>
        prevPres.id === nextProps.presentations[index]?.id &&
        prevPres.updatedAt === nextProps.presentations[index]?.updatedAt
    )
  )
})