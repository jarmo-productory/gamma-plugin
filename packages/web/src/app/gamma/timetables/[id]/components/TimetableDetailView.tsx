'use client'

import { useReducer, useEffect, useMemo, useCallback, useRef } from 'react'
import { Presentation, TimetableItem } from '../../types'
import PresentationStats from './PresentationStats'
import SimpleEditableTable from './SimpleEditableTable'
import { recalculateTimeTable, calculateTotalDuration } from '../utils/timeCalculations'
import { TimetableProvider } from '../TimetableDetailContext'

interface TimetableDetailViewProps {
  presentation: Presentation
  onSave: (updatedPresentation: Presentation) => void
  saving: boolean
}

type TimetableReducerState = {
  presentation: Presentation
  hasUnsavedChanges: boolean
}

type TimetableReducerAction =
  | { type: 'SYNC_FROM_SERVER'; payload: Presentation }
  | { type: 'UPDATE_START_TIME'; payload: string }
  | { type: 'UPDATE_DURATION'; payload: { slideId: string; minutes: number } }
  | { type: 'MARK_SAVED' }

const AUTO_SAVE_DELAY = 1000

const clonePresentation = (source: Presentation): Presentation => ({
  ...source,
  timetableData: {
    ...source.timetableData,
    items: source.timetableData.items.map((item) => ({ ...item })),
  },
})

const applyRecalculation = (
  presentation: Presentation,
  items: TimetableItem[],
  startTime: string,
) => {
  const recalculatedItems = recalculateTimeTable(items, startTime)
  const totalDuration = calculateTotalDuration(recalculatedItems)

  presentation.startTime = startTime
  presentation.totalDuration = totalDuration
  presentation.slideCount = recalculatedItems.length
  presentation.timetableData = {
    ...presentation.timetableData,
    startTime,
    totalDuration,
    items: recalculatedItems,
  }

  return presentation
}

const timetableReducer = (
  state: TimetableReducerState,
  action: TimetableReducerAction,
): TimetableReducerState => {
  switch (action.type) {
    case 'SYNC_FROM_SERVER': {
      return {
        presentation: clonePresentation(action.payload),
        hasUnsavedChanges: false,
      }
    }
    case 'UPDATE_START_TIME': {
      const nextPresentation = clonePresentation(state.presentation)
      const clonedItems = nextPresentation.timetableData.items.map((item) => ({ ...item }))
      const updated = applyRecalculation(nextPresentation, clonedItems, action.payload)
      return {
        presentation: updated,
        hasUnsavedChanges: true,
      }
    }
    case 'UPDATE_DURATION': {
      const { slideId, minutes } = action.payload
      const safeMinutes = Math.max(0, Math.round(minutes))
      const nextPresentation = clonePresentation(state.presentation)
      const updatedItems = nextPresentation.timetableData.items.map((item) =>
        item.id === slideId ? { ...item, duration: safeMinutes } : { ...item },
      )
      const recalculatedPresentation = applyRecalculation(
        nextPresentation,
        updatedItems,
        nextPresentation.timetableData.startTime,
      )
      return {
        presentation: recalculatedPresentation,
        hasUnsavedChanges: true,
      }
    }
    case 'MARK_SAVED':
      return {
        ...state,
        hasUnsavedChanges: false,
      }
    default:
      return state
  }
}

export default function TimetableDetailView({
  presentation,
  onSave,
  saving,
}: TimetableDetailViewProps) {
  const [state, dispatch] = useReducer(timetableReducer, {
    presentation: clonePresentation(presentation),
    hasUnsavedChanges: false,
  })

  const latestOnSaveRef = useRef(onSave)
  useEffect(() => {
    latestOnSaveRef.current = onSave
  }, [onSave])

  // Sync reducer state with parent presentation after confirmed save
  useEffect(() => {
    if (saving) return
    dispatch({ type: 'SYNC_FROM_SERVER', payload: presentation })
  }, [presentation, saving])

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!state.hasUnsavedChanges || saving) {
      return
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      latestOnSaveRef.current(state.presentation)
      dispatch({ type: 'MARK_SAVED' })
      autoSaveTimeoutRef.current = null
    }, AUTO_SAVE_DELAY)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
    }
  }, [state.presentation, state.hasUnsavedChanges, saving])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const updateStartTime = useCallback((time: string) => {
    dispatch({ type: 'UPDATE_START_TIME', payload: time })
  }, [])

  const updateSlideDuration = useCallback((slideId: string, minutes: number) => {
    dispatch({ type: 'UPDATE_DURATION', payload: { slideId, minutes } })
  }, [])

  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED' })
  }, [])

  const providerState = useMemo(
    () => ({
      presentation: state.presentation,
      hasUnsavedChanges: state.hasUnsavedChanges,
      saving,
    }),
    [state.presentation, state.hasUnsavedChanges, saving],
  )

  const providerActions = useMemo(
    () => ({
      updateStartTime,
      updateSlideDuration,
      markSaved,
    }),
    [updateStartTime, updateSlideDuration, markSaved],
  )

  return (
    <TimetableProvider state={providerState} actions={providerActions}>
      <div className="mb-6">
        <PresentationStats />
      </div>

      <div className="flex-1 min-h-0">
        <SimpleEditableTable key={`table-${state.presentation.updatedAt}`} />
      </div>
    </TimetableProvider>
  )
}

export type { TimetableReducerState, TimetableReducerAction }
export { timetableReducer }
