'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Check, X, Edit3, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  fetchDurationSuggestion,
  loadSlideState,
  markSlideAsEdited,
  dismissSuggestion,
  acceptSuggestion,
  isUserAuthenticated,
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
  const [slideState, setSlideState] = useState({ userEdited: false, suggestionDismissed: false })
  const inputRef = useRef<HTMLInputElement>(null)

  const formattedDuration = String(Math.max(0, Math.round(duration)))

  // Load slide state from localStorage on mount
  useEffect(() => {
    const state = loadSlideState(presentationId, slideId)
    setSlideState(state)
  }, [presentationId, slideId])

  // Fetch suggestion if conditions are met
  useEffect(() => {
    const shouldFetchSuggestion =
      !slideState.userEdited &&
      !slideState.suggestionDismissed &&
      !isEditing &&
      isUserAuthenticated() &&
      slideTitle &&
      slideContent.length > 0

    if (shouldFetchSuggestion && !suggestion && !suggestionLoading) {
      setSuggestionLoading(true)

      fetchDurationSuggestion({
        title: slideTitle,
        content: slideContent,
      })
        .then(result => {
          if (result && (result.confidence === 'high' || result.confidence === 'medium')) {
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
  }, [slideState, isEditing, slideTitle, slideContent, suggestion, suggestionLoading, presentationId, slideId])

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

    // Mark as manually edited
    markSlideAsEdited(presentationId, slideId)
    setSlideState(prev => ({ ...prev, userEdited: true }))
    setSuggestion(null) // Hide suggestion immediately

    onDurationChange(inputValue)
    setIsEditing(false)
  }

  const handleApplySuggestion = () => {
    if (suggestion) {
      // Accept suggestion
      acceptSuggestion(presentationId, slideId, suggestion)
      setSlideState(prev => ({ ...prev, userEdited: true }))

      onDurationChange(String(suggestion.averageDuration))
      setSuggestion(null)
    }
  }

  const handleDismissSuggestion = () => {
    dismissSuggestion(presentationId, slideId)
    setSlideState(prev => ({ ...prev, suggestionDismissed: true }))
    setSuggestion(null)
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

  // Render with suggestion badge (if available)
  const showSuggestion = suggestion && !slideState.userEdited && !slideState.suggestionDismissed

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors flex-1"
        onClick={startEditing}
      >
        <span className="text-sm font-medium">
          {formattedDuration}
        </span>
        <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {showSuggestion && (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-xs">
                  <Lightbulb className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    {suggestion.averageDuration} min
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={handleApplySuggestion}
                  >
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={handleDismissSuggestion}
                  >
                    <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">
                    AI Suggestion ({suggestion.confidence} confidence)
                  </p>
                  <p className="text-muted-foreground">
                    Based on {suggestion.sampleSize} similar slide{suggestion.sampleSize > 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2 text-muted-foreground">
                    <span>Range: {suggestion.durationRange.p25}-{suggestion.durationRange.p75} min</span>
                    <span>•</span>
                    <span>Median: {suggestion.durationRange.median} min</span>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Match: {Math.round(suggestion.matchQuality.titleSimilarity * 100)}% title, {Math.round(suggestion.matchQuality.contentSimilarity * 100)}% content
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
