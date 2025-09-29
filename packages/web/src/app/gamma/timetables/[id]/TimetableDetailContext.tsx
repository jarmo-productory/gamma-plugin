"use client"

import { createContext, useContext, ReactNode } from 'react'
import type { Presentation } from '../types'

export interface TimetableViewState {
  presentation: Presentation
  hasUnsavedChanges: boolean
  saving: boolean
}

export interface TimetableViewActions {
  updateStartTime: (time: string) => void
  updateSlideDuration: (slideId: string, minutes: number) => void
  markSaved: () => void
}

const TimetableStateContext = createContext<TimetableViewState | undefined>(undefined)
const TimetableActionsContext = createContext<TimetableViewActions | undefined>(undefined)

interface TimetableProviderProps {
  state: TimetableViewState
  actions: TimetableViewActions
  children: ReactNode
}

export function TimetableProvider({ state, actions, children }: TimetableProviderProps) {
  return (
    <TimetableStateContext.Provider value={state}>
      <TimetableActionsContext.Provider value={actions}>
        {children}
      </TimetableActionsContext.Provider>
    </TimetableStateContext.Provider>
  )
}

export function useTimetableState() {
  const context = useContext(TimetableStateContext)
  if (!context) {
    throw new Error('useTimetableState must be used within a TimetableProvider')
  }
  return context
}

export function useTimetableActions() {
  const context = useContext(TimetableActionsContext)
  if (!context) {
    throw new Error('useTimetableActions must be used within a TimetableProvider')
  }
  return context
}
