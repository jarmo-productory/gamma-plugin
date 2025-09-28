'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { parseStartTimeInput, formatTime } from '../utils/timeCalculations'
import { Check, X, Edit3, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditableStartTimeCellProps {
  startTime: string // HH:MM format
  onStartTimeChange: (newStartTime: string) => void
  isGlobalStartTime?: boolean
}

export default function EditableStartTimeCell({ 
  startTime, 
  onStartTimeChange,
  isGlobalStartTime = false
}: EditableStartTimeCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isValidInput, setIsValidInput] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const formattedTime = formatTime(startTime)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    setInputValue(formattedTime)
    setIsValidInput(true)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setInputValue('')
    setIsValidInput(true)
  }

  const saveEdit = () => {
    if (!isValidInput || !inputValue.trim()) {
      cancelEditing()
      return
    }

    const validTime = parseStartTimeInput(inputValue)
    if (validTime) {
      onStartTimeChange(validTime)
    }
    setIsEditing(false)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    
    // Validate input in real-time
    const validTime = parseStartTimeInput(value)
    setIsValidInput(validTime !== null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }

  const handleBlur = () => {
    // Save on blur if valid
    if (isValidInput) {
      saveEdit()
    } else {
      cancelEditing()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`h-8 text-sm pl-8 ${!isValidInput ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="09:00, 14:30"
          />
          <Clock className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={saveEdit}
            disabled={!isValidInput}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={cancelEditing}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors ${
        isGlobalStartTime ? 'bg-primary/5 border border-primary/20' : ''
      }`}
      onClick={startEditing}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className={`text-sm font-medium ${isGlobalStartTime ? 'text-primary' : ''}`}>
          {formattedTime}
        </span>
        {isGlobalStartTime && (
          <span className="text-xs text-primary/70 font-medium">
            (Global Start)
          </span>
        )}
      </div>
      <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}