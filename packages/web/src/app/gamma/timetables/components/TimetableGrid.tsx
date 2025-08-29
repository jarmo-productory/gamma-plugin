'use client'

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

export default function TimetableGrid({ 
  presentations, 
  loading, 
  onView, 
  onExport, 
  onDelete 
}: TimetableGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <LoadingSkeleton count={6} />
      </div>
    )
  }

  if (presentations.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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