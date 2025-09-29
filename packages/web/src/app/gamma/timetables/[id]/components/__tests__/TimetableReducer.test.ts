import { describe, it, expect } from 'vitest'
import { timetableReducer, type TimetableReducerState } from '../TimetableDetailView'
import type { Presentation } from '../../../types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const buildPresentation = (): Presentation => ({
  id: 'pres-1',
  title: 'Sample Presentation',
  presentationUrl: 'https://example.com/pres',
  startTime: '09:00',
  totalDuration: 45,
  slideCount: 2,
  timetableData: {
    startTime: '09:00',
    totalDuration: 45,
    items: [
      {
        id: 'slide-1',
        title: 'Intro',
        content: ['Welcome'],
        startTime: '09:00',
        duration: 15,
        endTime: '09:15',
      },
      {
        id: 'slide-2',
        title: 'Deep Dive',
        content: ['Details'],
        startTime: '09:15',
        duration: 30,
        endTime: '09:45',
      },
    ],
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
})

const buildState = (): TimetableReducerState => ({
  presentation: clone(buildPresentation()),
  hasUnsavedChanges: false,
})

describe('timetableReducer', () => {
  it('recalculates timings when duration changes', () => {
    const baseState = buildState()

    const nextState = timetableReducer(baseState, {
      type: 'UPDATE_DURATION',
      payload: { slideId: 'slide-2', minutes: 20 },
    })

    expect(nextState.hasUnsavedChanges).toBe(true)
    expect(nextState.presentation.totalDuration).toBe(35)
    expect(nextState.presentation.timetableData.totalDuration).toBe(35)
    expect(nextState.presentation.timetableData.items[1]).toMatchObject({
      id: 'slide-2',
      startTime: '09:15',
      endTime: '09:35',
      duration: 20,
    })
  })

  it('updates slide start times when the presentation start time changes', () => {
    const baseState = buildState()

    const nextState = timetableReducer(baseState, {
      type: 'UPDATE_START_TIME',
      payload: '10:00',
    })

    expect(nextState.presentation.startTime).toBe('10:00')
    expect(nextState.presentation.timetableData.startTime).toBe('10:00')
    expect(nextState.presentation.timetableData.items[0].startTime).toBe('10:00')
    expect(nextState.presentation.timetableData.items[1].startTime).toBe('10:15')
    expect(nextState.presentation.timetableData.items[1].endTime).toBe('10:45')
  })

  it('resets unsaved changes on server sync', () => {
    const initialState: TimetableReducerState = {
      presentation: clone(buildPresentation()),
      hasUnsavedChanges: true,
    }

    const synced = timetableReducer(initialState, {
      type: 'SYNC_FROM_SERVER',
      payload: buildPresentation(),
    })

    expect(synced.hasUnsavedChanges).toBe(false)
    expect(synced.presentation).not.toBe(initialState.presentation)
  })
})
