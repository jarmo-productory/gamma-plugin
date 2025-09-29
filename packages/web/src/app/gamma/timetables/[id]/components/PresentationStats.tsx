'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Clock, 
  Calendar, 
  Presentation, 
  Timer,
  FileText
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatDuration, formatTime } from '../utils/timeCalculations'
import { useTimetableState } from '../TimetableDetailContext'
export default function PresentationStats() {
  const { presentation } = useTimetableState()
  const { timetableData } = presentation
  
  const estimatedEndTime = timetableData.items[timetableData.items.length - 1]?.endTime || presentation.startTime

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Presentation className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Presentation Overview</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated {formatDistanceToNow(new Date(presentation.updatedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Duration */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Timer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Duration</div>
              <div className="text-lg font-semibold">{formatDuration(presentation.totalDuration)}</div>
            </div>
          </div>

          {/* Total Slides */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <FileText className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Slides</div>
              <div className="text-lg font-semibold">{presentation.slideCount}</div>
            </div>
          </div>

          {/* Start Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Starts At</div>
              <div className="text-lg font-semibold font-mono">{formatTime(presentation.startTime)}</div>
            </div>
          </div>

          {/* End Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Ends At</div>
              <div className="text-lg font-semibold font-mono">{formatTime(estimatedEndTime)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
