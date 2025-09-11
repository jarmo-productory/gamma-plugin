'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
// No time converter: users input minutes only
import { Check, X, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditableDurationCellProps {
  duration: number // in minutes
  onDurationChange: (newDurationString: string) => void
  slideId: string
}

export default function EditableDurationCell({ 
  duration, 
  onDurationChange, 
  slideId 
}: EditableDurationCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isValidInput, setIsValidInput] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const formattedDuration = String(Math.max(0, Math.round(duration)))

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = () => {
    setInputValue(formattedDuration)
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

    onDurationChange(inputValue)
    setIsEditing(false)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    // Validate minutes: non-negative number
    const n = Number(value)
    setIsValidInput(Number.isFinite(n) && n >= 0)
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
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`h-8 text-sm ${!isValidInput ? 'border-red-500 bg-red-50' : ''}`}
          placeholder="minutes"
        />
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
      className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
      onClick={startEditing}
    >
      <span className="text-sm font-medium">
        {formattedDuration}
      </span>
      <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
