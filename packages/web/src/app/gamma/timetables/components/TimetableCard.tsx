'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  Presentation, 
  Download, 
  MoreHorizontal,
  Trash2,
  Eye 
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

  const handleCardClick = () => {
    onView(presentation.id)
  }

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation()
    onExport(presentation.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(presentation.id)
  }

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-purple-100 border-2 hover:border-purple-200"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
            <Presentation className="h-5 w-5 text-purple-600" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors">
              {presentation.title}
            </h3>
            
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  Updated {formatDistanceToNow(new Date(presentation.updatedAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Presentation className="h-4 w-4 text-gray-400" />
                  <span>{presentation.slideCount} slides</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDuration(presentation.totalDuration)} total</span>
                </div>
              </div>
            </div>
            
            {/* Start Time Badge */}
            <div className="mt-3">
              <Badge variant="secondary" className="text-xs">
                Starts at {presentation.startTime}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 py-4 bg-gray-50 group-hover:bg-purple-50 transition-colors border-t">
        <div className="flex items-center justify-between w-full">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCardClick}
            className="flex items-center gap-1 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="flex items-center gap-1 hover:bg-green-100 hover:text-green-700 hover:border-green-300"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCardClick}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export XLSX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}