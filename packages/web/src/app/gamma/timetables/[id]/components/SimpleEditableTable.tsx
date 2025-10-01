'use client'

import React, { useState, useRef, useEffect } from 'react'
import { formatTime, parseStartTimeInput } from '../utils/timeCalculations'
import { useTimetableActions, useTimetableState } from '../TimetableDetailContext'
import { Lightbulb, Check, X } from 'lucide-react'
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

export default function SimpleEditableTable() {
  const { presentation } = useTimetableState()
  const { updateStartTime, updateSlideDuration } = useTimetableActions()
  const [editingCell, setEditingCell] = useState<{ slideId: string; field: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Record<string, DurationSuggestion>>({})
  const [slideStates, setSlideStates] = useState<Record<string, { userEdited: boolean; suggestionDismissed: boolean }>>({})

  const { timetableData } = presentation

  // Load slide states and fetch suggestions on mount
  useEffect(() => {
    if (!isUserAuthenticated()) return

    // Load states for all slides
    const states: Record<string, any> = {}
    timetableData.items.forEach(item => {
      states[item.id] = loadSlideState(presentation.id, item.id)
    })
    setSlideStates(states)

    // Fetch suggestions for untouched slides
    timetableData.items.forEach(item => {
      const state = states[item.id]
      if (!state.userEdited && !state.suggestionDismissed && item.title) {
        fetchDurationSuggestion({
          title: item.title,
          content: item.content || [],
        }).then(result => {
          if (result && (result.confidence === 'high' || result.confidence === 'medium')) {
            setSuggestions(prev => ({ ...prev, [item.id]: result }))
          }
        })
      }
    })
  }, [presentation.id, timetableData.items])

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const startEditing = (slideId: string, field: string, currentValue: string) => {
    setEditingCell({ slideId, field })
    setInputValue(currentValue)
  }

  const saveEdit = () => {
    if (!editingCell || !inputValue.trim()) {
      setEditingCell(null)
      return
    }

    const { slideId, field } = editingCell

    if (field === 'startTime') {
      // Only allow editing start time for the first slide
      const firstSlide = timetableData.items[0]
      if (slideId === firstSlide.id) {
        const parsed = parseStartTimeInput(inputValue)
        if (parsed) {
          updateStartTime(parsed)
        }
      }
    } else if (field === 'duration') {
      const trimmed = (inputValue ?? '').trim()
      const minutes = Number(trimmed)
      if (Number.isFinite(minutes) && minutes >= 0) {
        // Mark as manually edited
        markSlideAsEdited(presentation.id, slideId)
        setSlideStates(prev => ({ ...prev, [slideId]: { ...prev[slideId], userEdited: true } }))
        setSuggestions(prev => {
          const updated = { ...prev }
          delete updated[slideId]
          return updated
        })

        updateSlideDuration(slideId, Math.round(minutes))
      }
    }

    setEditingCell(null)
  }

  const handleApplySuggestion = (slideId: string) => {
    const suggestion = suggestions[slideId]
    if (!suggestion) return

    acceptSuggestion(presentation.id, slideId, suggestion)
    setSlideStates(prev => ({ ...prev, [slideId]: { ...prev[slideId], userEdited: true } }))
    setSuggestions(prev => {
      const updated = { ...prev }
      delete updated[slideId]
      return updated
    })

    updateSlideDuration(slideId, suggestion.averageDuration)
  }

  const handleDismissSuggestion = (slideId: string) => {
    dismissSuggestion(presentation.id, slideId)
    setSlideStates(prev => ({ ...prev, [slideId]: { ...prev[slideId], suggestionDismissed: true } }))
    setSuggestions(prev => {
      const updated = { ...prev }
      delete updated[slideId]
      return updated
    })
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  const handleBlur = () => {
    saveEdit()
  }

  // We display duration strictly as minutes (integer)
  const asMinutesString = (minutes: number): string => String(Math.max(0, Math.round(minutes)))

  return (
    <div className="border rounded-lg bg-white h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r w-24">Start</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r w-24">End</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r w-32">Duration (min)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Slide title</th>
            </tr>
          </thead>
          <tbody>
            {timetableData.items.map((item, index) => {
              const isFirstSlide = index === 0
              const isEditingStartTime = editingCell?.slideId === item.id && editingCell?.field === 'startTime'
              const isEditingDuration = editingCell?.slideId === item.id && editingCell?.field === 'duration'

              return (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  {/* Start Time */}
                  <td className="px-4 py-2 text-sm border-r w-24">
                    {isEditingStartTime ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className="w-16 px-1 py-0.5 text-sm border-0 outline-none bg-blue-50 focus:bg-blue-100"
                        placeholder="14:30"
                      />
                    ) : (
                      <div
                        className={`px-1 py-0.5 cursor-${isFirstSlide ? 'pointer' : 'default'}`}
                        onClick={() => isFirstSlide && startEditing(item.id, 'startTime', formatTime(item.startTime))}
                      >
                        {formatTime(item.startTime)}
                      </div>
                    )}
                  </td>

                  {/* End Time */}
                  <td className="px-4 py-2 text-sm border-r w-24">
                    <div className="px-1 py-0.5">
                      {formatTime(item.endTime)}
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-2 text-sm border-r">
                    <div className="flex items-center gap-2">
                      {isEditingDuration ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleBlur}
                          className="w-12 px-1 py-0.5 text-sm border-0 outline-none bg-blue-50 focus:bg-blue-100"
                          placeholder="5"
                        />
                      ) : (
                        <>
                          <div
                            className="px-1 py-0.5 cursor-pointer hover:bg-gray-100 rounded"
                            onClick={() => startEditing(item.id, 'duration', asMinutesString(item.duration))}
                          >
                            {asMinutesString(item.duration)}
                          </div>

                          {/* Suggestion Badge */}
                          {suggestions[item.id] && !slideStates[item.id]?.userEdited && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                                    <Lightbulb className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                    <span className="font-medium text-blue-700 dark:text-blue-300">
                                      {suggestions[item.id].averageDuration} min
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApplySuggestion(item.id)
                                      }}
                                    >
                                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDismissSuggestion(item.id)
                                      }}
                                    >
                                      <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-semibold">
                                      AI Suggestion ({suggestions[item.id].confidence} confidence)
                                    </p>
                                    <p className="text-muted-foreground">
                                      Based on {suggestions[item.id].sampleSize} similar slide{suggestions[item.id].sampleSize > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex gap-2 text-muted-foreground">
                                      <span>Range: {suggestions[item.id].durationRange.p25}-{suggestions[item.id].durationRange.p75} min</span>
                                      <span>•</span>
                                      <span>Median: {suggestions[item.id].durationRange.median} min</span>
                                    </div>
                                    <div className="text-muted-foreground text-[10px]">
                                      Match: {Math.round(suggestions[item.id].matchQuality.titleSimilarity * 100)}% title, {Math.round(suggestions[item.id].matchQuality.contentSimilarity * 100)}% content
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Slide Title */}
                  <td className="px-4 py-2 text-sm">
                    <div className="px-1 py-0.5">
                      {item.title}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
