'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Check, X, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchDurationSuggestion,
} from '@/lib/durationSuggestions'
import type { DurationSuggestion } from '@/types'

interface EditableDurationCellWithSuggestionProps {
  duration: number // in minutes
  onDurationChange: (newDurationString: string) => void
  slideId: string
  presentationId: string
  slideTitle: string
  slideContent: string[]
}

export default function EditableDurationCellWithSuggestion({
  duration,
  onDurationChange,
  slideId,
  presentationId,
  slideTitle,
  slideContent
}: EditableDurationCellWithSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isValidInput, setIsValidInput] = useState(true)
  const [suggestion, setSuggestion] = useState<DurationSuggestion | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const formattedDuration = String(Math.max(0, Math.round(duration)))

  // Fetch suggestion - always show if available
  useEffect(() => {
    const shouldFetchSuggestion =
      slideTitle &&
      slideContent.length > 0

    if (shouldFetchSuggestion && !suggestion && !suggestionLoading) {
      setSuggestionLoading(true)

      fetchDurationSuggestion({
        title: slideTitle,
        content: slideContent,
      })
        .then(result => {
          // ALWAYS show suggestions - don't hide based on confidence
          if (result) {
            setSuggestion(result)
          }
        })
        .catch(err => {
          console.error('[Duration Suggestion] Fetch failed:', err)
        })
        .finally(() => {
          setSuggestionLoading(false)
        })
    }
  }, [slideTitle, slideContent, suggestion, suggestionLoading])

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

  // Render editing mode
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

  // Render with suggestion text (if available)
  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div
        className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
        onClick={startEditing}
      >
        <span className="text-sm font-medium">
          {formattedDuration}
        </span>
        <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {suggestion && (
        <div className="text-xs text-muted-foreground px-2">
          {suggestion.sampleSize > 0 ? (
            <>
              Suggested: {suggestion.averageDuration} min
              <span className="ml-1">
                (based on {suggestion.sampleSize} similar slide{suggestion.sampleSize > 1 ? 's' : ''})
              </span>
            </>
          ) : (
            <span className="italic opacity-60">
              No similar slides yet
            </span>
          )}
        </div>
      )}
    </div>
  )
}
