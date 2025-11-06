'use client'

import React, { useMemo } from 'react'
import { TableVirtuoso } from 'react-virtuoso'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { Presentation } from '../../types'
import EditableDurationCellWithSuggestion from './EditableDurationCellWithSuggestion'
import EditableStartTimeCell from './EditableStartTimeCell'
import { formatTime } from '../utils/timeCalculations'

interface CustomEditableTableProps {
  presentation: Presentation
  onStartTimeChange: (newStartTime: string) => void
  onDurationChange: (slideId: string, newDurationString: string) => void
}

export default function CustomEditableTable({
  presentation,
  onStartTimeChange,
  onDurationChange
}: CustomEditableTableProps) {
  const { timetableData } = presentation
  
  // Prepare data for virtualization
  const tableData = useMemo(() => {
    return timetableData.items.map((item, index) => ({
      ...item,
      slideNumber: index + 1,
      isFirstSlide: index === 0
    }))
  }, [timetableData.items])

  // Custom table components for react-virtuoso
  const VirtuosoTableComponents = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <div ref={ref} {...props} className="overflow-auto" />
    )),
    Table: (props: any) => (
      <table {...props} className="w-full caption-bottom text-sm border-separate border-spacing-0" />
    ),
    TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <thead ref={ref} {...props} className="[&_tr]:border-b" />
    )),
    TableRow: ({ item: _item, ...props }: any) => (
      <tr {...props} className="border-b transition-colors hover:bg-muted/50" />
    ),
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <tbody ref={ref} {...props} />
    ))
  }

  // Fixed header component
  const fixedHeaderContent = () => (
    <tr className="border-b">
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-20 text-center sticky top-0 z-10 bg-background border-b">
        Slide
      </th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[200px] sticky top-0 z-10 bg-background border-b">
        Content
      </th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-32 text-center sticky top-0 z-10 bg-background border-b">
        Start Time
      </th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-36 text-center sticky top-0 z-10 bg-background border-b">
        Duration (min)
      </th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-32 text-center sticky top-0 z-10 bg-background border-b">
        End Time
      </th>
    </tr>
  )

  // Row renderer for virtuoso
  const rowContent = (index: number) => {
    const item = tableData[index]
    
    return (
      <>
        {/* Slide Number */}
        <td className="p-4 align-middle text-center border-r border-border/60">
          <Badge 
            variant={item.isFirstSlide ? "default" : "secondary"} 
            className="font-mono text-xs"
          >
            {item.slideNumber}
          </Badge>
        </td>

        {/* Content */}
        <td className="p-4 align-middle border-r border-border/60">
          <div className="space-y-1">
            {item.content.slice(0, 3).map((line, lineIndex) => (
              <div
                key={lineIndex}
                className="text-sm text-foreground line-clamp-1"
                title={typeof line === 'string' ? line : ''}
              >
                {typeof line === 'string' ? line : JSON.stringify(line)}
              </div>
            ))}
            {item.content.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{item.content.length - 3} more lines...
              </div>
            )}
          </div>
        </td>

        {/* Start Time - Editable for first slide only */}
        <td className="p-4 align-middle border-r border-border/60">
          {item.isFirstSlide ? (
            <EditableStartTimeCell
              startTime={item.startTime}
              onStartTimeChange={onStartTimeChange}
              isGlobalStartTime={true}
            />
          ) : (
            <div className="text-center text-sm font-mono text-muted-foreground">
              {formatTime(item.startTime)}
            </div>
          )}
        </td>

        {/* Duration - Always editable */}
        <td className="p-4 align-middle border-r border-border/60">
          <EditableDurationCellWithSuggestion
            duration={item.duration}
            onDurationChange={(newDuration) => onDurationChange(item.id, newDuration)}
            slideId={item.id}
            presentationId={presentation.id}
            slideTitle={item.title}
            slideContent={item.content}
          />
        </td>

        {/* End Time - Read-only, calculated */}
        <td className="p-4 align-middle text-center">
          <div className="text-sm font-mono text-muted-foreground">
            {formatTime(item.endTime)}
          </div>
        </td>
      </>
    )
  }

  return (
    <div className="border rounded-lg bg-card">
      {/* Table Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Presentation Timeline</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Edit slide durations and start time. Times recalculate automatically.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Total slides:</span>
              <Badge variant="outline">{tableData.length}</Badge>
            </div>
            {presentation.presentationUrl && (
              <a
                href={presentation.presentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Original</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Virtualized Table */}
      <div className="h-[600px]">
        <TableVirtuoso
          data={tableData}
          components={VirtuosoTableComponents}
          fixedHeaderContent={fixedHeaderContent}
          itemContent={rowContent}
          overscan={5}
        />
      </div>
    </div>
  )
}
