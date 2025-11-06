'use client'

import React, { useState, useRef, useEffect } from 'react'
import { formatTime, parseStartTimeInput } from '../utils/timeCalculations'
import { useTimetableActions, useTimetableState } from '../TimetableDetailContext'
import {
  fetchDurationSuggestion,
} from '@/lib/durationSuggestions'
import type { DurationSuggestion } from '@/types'

export default function SimpleEditableTable() {
  const { presentation } = useTimetableState()
  const { updateStartTime, updateSlideDuration } = useTimetableActions()
  const [editingCell, setEditingCell] = useState<{ slideId: string; field: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Record<string, DurationSuggestion>>({})

  const { timetableData } = presentation

  // Fetch suggestions on mount - always show if available
  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    // Fetch suggestions for all slides with titles
    const fetchSuggestions = async () => {
      const itemsWithContent = timetableData.items.filter(
        item => item.title && item.content && item.content.length > 0
      )

      console.log(`[SimpleEditableTable] Fetching suggestions for ${itemsWithContent.length} slides`)

      for (const item of itemsWithContent) {
        if (!isMounted) break

        try {
          console.log(`[SimpleEditableTable] Requesting suggestion for "${item.title}"`)
          const result = await fetchDurationSuggestion({
            title: item.title,
            content: item.content || [],
          })

          if (isMounted && result) {
            console.log(`[SimpleEditableTable] Got suggestion for "${item.title}": ${JSON.stringify(result)}`)
            setSuggestions(prev => ({ ...prev, [item.id]: result }))
          } else {
            console.log(`[SimpleEditableTable] No suggestion returned for "${item.title}"`)
          }
        } catch (err) {
          if (isMounted) {
            console.error('[Duration Suggestion] Fetch error:', err)
          }
        }
      }
    }

    // Only fetch if we have slides
    if (timetableData.items.length > 0) {
      fetchSuggestions()
    }

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [presentation.id, timetableData.items.length])

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
        updateSlideDuration(slideId, Math.round(minutes))
      }
    }

    setEditingCell(null)
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
                      <div className="flex flex-col gap-0.5">
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

                            {/* Suggestion Text */}
                            {suggestions[item.id] && suggestions[item.id].sampleSize > 0 && (
                              <div className="text-xs text-muted-foreground px-1">
                                Suggested: {suggestions[item.id].averageDuration} min
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
