import * as React from "react"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { cn } from "@lib/utils"

/**
 * Gamma-specific React components that match existing design patterns
 */

interface TimetableItemProps {
  title: string
  duration: number
  onDurationChange: (duration: number) => void
  startTime?: string
  endTime?: string
  className?: string
}

export function TimetableItem({
  title,
  duration,
  onDurationChange,
  startTime,
  endTime,
  className
}: TimetableItemProps) {
  return (
    <Card className={cn("slide-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Duration:</span>
          <div className="flex items-center gap-2">
            <Input
              type="range"
              min="0"
              max="60"
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="range-slider w-24"
            />
            <span className="text-sm font-medium text-gray-800 min-w-[3ch]">
              {duration}m
            </span>
          </div>
        </div>
        
        {startTime && endTime && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Start: {startTime}</span>
            <span>End: {endTime}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SyncControlsProps {
  isAuthenticated: boolean
  isSyncing: boolean
  autoSync: boolean
  onSaveToCloud: () => void
  onLoadFromCloud: () => void
  onToggleAutoSync: () => void
  className?: string
}

export function SyncControls({
  isAuthenticated,
  isSyncing,
  autoSync,
  onSaveToCloud,
  onLoadFromCloud,
  onToggleAutoSync,
  className
}: SyncControlsProps) {
  if (!isAuthenticated) return null

  return (
    <div className={cn("sync-container", className)}>
      <div className="sync-controls">
        <Button
          variant="sync-save"
          size="sm"
          onClick={onSaveToCloud}
          disabled={isSyncing}
        >
          {isSyncing ? 'Saving...' : 'Save to Cloud'}
        </Button>
        
        <Button
          variant="sync-load"
          size="sm"
          onClick={onLoadFromCloud}
          disabled={isSyncing}
        >
          {isSyncing ? 'Loading...' : 'Load from Cloud'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAutoSync}
          className={cn("sync-btn-toggle", autoSync && "active")}
        >
          Auto Sync: {autoSync ? 'On' : 'Off'}
        </Button>
      </div>
    </div>
  )
}

interface ExportControlsProps {
  onExportCsv: () => void
  onExportExcel: () => void
  onExportPdf: () => void
  className?: string
}

export function ExportControls({
  onExportCsv,
  onExportExcel,
  onExportPdf,
  className
}: ExportControlsProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      <Button variant="export" size="sm" onClick={onExportCsv}>
        Export CSV
      </Button>
      <Button variant="export" size="sm" onClick={onExportExcel}>
        Export Excel
      </Button>
      <Button variant="export" size="sm" onClick={onExportPdf}>
        Export PDF
      </Button>
    </div>
  )
}