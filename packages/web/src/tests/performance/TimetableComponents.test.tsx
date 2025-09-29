import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi, type Mock } from 'vitest'

import TimetableCard from '@/app/gamma/timetables/components/TimetableCard'
import TimetablesClient from '@/app/gamma/timetables/TimetablesClient'
import TimetableDetailClient from '@/app/gamma/timetables/[id]/TimetableDetailClient'
import { featureFlags, basicPerformanceMonitor } from '@/utils/performance'
import type { Presentation } from '@/app/gamma/timetables/types'

const mockPush = vi.fn()
const mockPathname = vi.fn(() => '/gamma/timetables')

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => mockPathname(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

global.fetch = vi.fn()
const fetchMock = global.fetch as Mock

const buildPresentation = (): Presentation => ({
  id: 'test-123',
  title: 'Test Presentation',
  presentationUrl: 'https://example.com/presentation',
  startTime: '09:00',
  totalDuration: 60,
  slideCount: 10,
  timetableData: {
    startTime: '09:00',
    totalDuration: 60,
    items: [
      {
        id: '1',
        title: 'Introduction',
        content: ['Welcome', 'Agenda'],
        startTime: '09:00',
        duration: 15,
        endTime: '09:15',
      },
    ],
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
})

describe('Timetable React performance surfaces', () => {
  let presentation: Presentation
  let originalMonitorOptions: any

  const renderCountFor = (component: string) =>
    (basicPerformanceMonitor.getMetrics(component) as any).renderCount ?? 0

  beforeAll(() => {
    featureFlags.setFlag('performanceTracking', true)
    featureFlags.setFlag('reactOptimizations', true)

    originalMonitorOptions = { ...(basicPerformanceMonitor as any).options }
    ;(basicPerformanceMonitor as any).options = {
      ...originalMonitorOptions,
      enabled: true,
      logToConsole: false,
      trackToMemory: true,
    }
  })

  beforeEach(() => {
    presentation = buildPresentation()
    fetchMock.mockReset()
    mockPush.mockReset()
    mockPathname.mockReturnValue('/gamma/timetables')
    basicPerformanceMonitor.resetMetrics()
  })

  afterAll(() => {
    ;(basicPerformanceMonitor as any).options = originalMonitorOptions
    vi.restoreAllMocks()
  })

  describe('TimetableCard', () => {
    it('tracks render metrics when performance tracking is enabled', () => {
      render(
        <TimetableCard
          presentation={presentation}
          onView={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      expect(renderCountFor('TimetableCard')).toBeGreaterThan(0)
    })

    it('invokes onView when the view button is clicked', () => {
      const onView = vi.fn()

      render(
        <TimetableCard
          presentation={presentation}
          onView={onView}
          onExport={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /view/i }))
      expect(onView).toHaveBeenCalledWith(presentation.id)
    })
  })

  describe('TimetablesClient', () => {
    const props = { user: { email: 'test@example.com', name: 'Test User' } }

    beforeEach(() => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/presentations/list')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, presentations: [presentation] }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      })
    })

    it('renders fetched presentations', async () => {
      render(<TimetablesClient {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument()
      })

      expect(fetchMock).toHaveBeenCalled()
      expect(fetchMock.mock.calls[0][0]).toContain('/api/presentations/list')
    })
  })

  describe('TimetableDetailClient', () => {
    const props = {
      user: { email: 'test@example.com', name: 'Test User' },
      presentationId: 'test-123',
    }

    beforeEach(() => {
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/presentations/test-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, presentation }),
          })
        }
        if (url.includes('/api/presentations/save')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, presentation }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      })
    })

    it('loads presentation details from the API', async () => {
      render(<TimetableDetailClient {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument()
      })

      expect(fetchMock).toHaveBeenCalled()
      expect(fetchMock.mock.calls[0][0]).toContain('/api/presentations/test-123')
    })
  })
})
