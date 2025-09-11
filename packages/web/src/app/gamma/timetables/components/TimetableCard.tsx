'use client'

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

export default function TimetableCard({ 
  presentation, 
  onView, 
  onExport, 
  onDelete 
}: TimetableCardProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
  }

  const formatDurationCompact = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}m` : `${h}h`
  }

  const formatUpdatedCompact = (date: Date) => {
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
  }

  const handleCardClick = () => {
    onView(presentation.id)
  }

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView(presentation.id)
  }

  // Export action is not shown in list card footer per UX guideline (max 1-2 actions; list uses primary only)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(presentation.id)
  }

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
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`Updated ${formatDistanceToNow(new Date(presentation.updatedAt), { addSuffix: true })}`}>
            <UploadCloud className="h-3.5 w-3.5" />
            {formatUpdatedCompact(new Date(presentation.updatedAt))}
          </span>
          <span className="text-muted-foreground/70">•</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title="Total duration">
            <Clock className="h-3.5 w-3.5" />
            {formatDurationCompact(presentation.totalDuration)}
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
