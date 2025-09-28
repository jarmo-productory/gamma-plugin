'use client'

import { useState, useEffect } from 'react'
import { Presentation } from '../../types'
import PresentationStats from './PresentationStats'
import SimpleEditableTable from './SimpleEditableTable'
import { recalculateTimeTable } from '../utils/timeCalculations'

interface TimetableDetailViewProps {
  presentation: Presentation
  onSave: (updatedPresentation: Presentation) => void
  saving: boolean
}

export default function TimetableDetailView({ 
  presentation, 
  onSave, 
  saving 
}: TimetableDetailViewProps) {
  const [localPresentation, setLocalPresentation] = useState(presentation)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Sync localPresentation from parent after a confirmed save (avoid clobbering in-progress edits)
  useEffect(() => {
    // Only sync when not actively saving; rely on parent revision/updatedAt as change signal
    if (saving) return
    setLocalPresentation(presentation)
    setHasUnsavedChanges(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Narrow change signals to meaningful fields to avoid ref-equality pitfalls
    // @ts-expect-error - revision is an internal runtime field
    (presentation as any)._revision,
    presentation.updatedAt,
    saving,
  ])

  // Handle start time changes with recalculation
  const handleStartTimeChange = (newStartTime: string) => {
    const updatedPresentation = {
      ...localPresentation,
      startTime: newStartTime,
      timetableData: {
        ...localPresentation.timetableData,
        startTime: newStartTime,
        items: recalculateTimeTable(localPresentation.timetableData.items, newStartTime)
      }
    }
    setLocalPresentation(updatedPresentation)
    setHasUnsavedChanges(true)
    
    // Auto-save after a brief delay
    setTimeout(() => {
      onSave(updatedPresentation)
      setHasUnsavedChanges(false)
    }, 1000)
  }

  // Handle individual slide duration changes
  const handleDurationChange = (slideId: string, newDurationString: string) => {
    // Minutes-only input; ignore anything else
    const trimmed = (newDurationString ?? '').trim()
    const asNum = Number(trimmed)
    if (!Number.isFinite(asNum) || asNum < 0) return
    const newDurationMinutes = Math.round(asNum)
    
    // Update the specific slide duration
    const updatedItems = localPresentation.timetableData.items.map(item => 
      item.id === slideId 
        ? { ...item, duration: newDurationMinutes }
        : item
    )
    
    // Recalculate all times based on new durations
    const recalculatedItems = recalculateTimeTable(updatedItems, localPresentation.startTime)
    
    // Calculate new total duration
    const totalDuration = recalculatedItems.reduce((sum, item) => sum + item.duration, 0)
    
    const updatedPresentation = {
      ...localPresentation,
      totalDuration,
      timetableData: {
        ...localPresentation.timetableData,
        items: recalculatedItems,
        totalDuration
      }
    }
    
    setLocalPresentation(updatedPresentation)
    setHasUnsavedChanges(true)
    
    // Auto-save after a brief delay
    setTimeout(() => {
      onSave(updatedPresentation)
      setHasUnsavedChanges(false)
    }, 1000)
  }

  // Handle manual save trigger
  const handleManualSave = () => {
    if (hasUnsavedChanges) {
      onSave(localPresentation)
      setHasUnsavedChanges(false)
    }
  }

  return (
    <>
      {/* Presentation Statistics */}
      <div className="mb-6">
        <PresentationStats presentation={localPresentation} />
      </div>
      
      {/* Main Editable Table - Takes remaining height */}
      <div className="flex-1 min-h-0">
        <SimpleEditableTable 
          key={`table-${localPresentation.updatedAt}-${localPresentation._revision || 0}`}
          presentation={localPresentation}
          onStartTimeChange={handleStartTimeChange}
          onDurationChange={handleDurationChange}
        />
      </div>
    </>
  )
}
