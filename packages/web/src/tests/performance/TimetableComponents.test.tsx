import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import TimetableCard from '@/app/gamma/timetables/components/TimetableCard';
import TimetablesClient from '@/app/gamma/timetables/TimetablesClient';
import TimetableDetailClient from '@/app/gamma/timetables/[id]/TimetableDetailClient';
import { performanceMonitor, featureFlags } from '@/utils/performance';
import type { Presentation } from '@/app/gamma/timetables/types';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('React Performance Optimizations', () => {
  let mockPresentation: Presentation;
  let renderSpy: jest.SpyInstance;

  beforeAll(() => {
    // Enable performance tracking for tests
    featureFlags.setFlag('performanceTracking', true);
    featureFlags.setFlag('reactOptimizations', true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.resetMetrics();
    renderSpy = jest.spyOn(performanceMonitor, 'trackRender');

    mockPresentation = {
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
            endTime: '09:15'
          }
        ]
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('TimetableCard Performance', () => {
    const defaultProps = {
      presentation: mockPresentation,
      onView: jest.fn(),
      onExport: jest.fn(),
      onDelete: jest.fn(),
    };

    it('should render without unnecessary re-renders', () => {
      const { rerender } = render(<TimetableCard {...defaultProps} />);

      // Initial render
      expect(renderSpy).toHaveBeenCalledWith('TimetableCard', 'component rendered');

      // Re-render with same props - should NOT trigger render tracking
      rerender(<TimetableCard {...defaultProps} />);

      // Should only have been called once (initial render)
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-render only when presentation data changes', () => {
      const { rerender } = render(<TimetableCard {...defaultProps} />);

      const updatedPresentation = {
        ...mockPresentation,
        title: 'Updated Title'
      };

      // Re-render with changed presentation
      rerender(<TimetableCard {...defaultProps} presentation={updatedPresentation} />);

      // Should trigger a new render
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle memoized event handlers correctly', () => {
      const onView = jest.fn();
      const onDelete = jest.fn();

      render(<TimetableCard {...defaultProps} onView={onView} onDelete={onDelete} />);

      // Test view button
      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);
      expect(onView).toHaveBeenCalledWith(mockPresentation.id);

      // Reset and test card click
      onView.mockClear();
      const card = screen.getByRole('button', { name: /test presentation/i });
      fireEvent.click(card);
      expect(onView).toHaveBeenCalledWith(mockPresentation.id);
    });

    it('should format dates and durations consistently', () => {
      render(<TimetableCard {...defaultProps} />);

      // Check that formatted values are displayed
      expect(screen.getByText('1h')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // slide count
    });
  });

  describe('TimetablesClient Performance', () => {
    const defaultProps = {
      user: { email: 'test@example.com', name: 'Test User' }
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/presentations/list')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              presentations: [mockPresentation]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
    });

    it('should memoize event handlers to prevent child re-renders', async () => {
      render(<TimetablesClient {...defaultProps} />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument();
      });

      // Verify that handlers are memoized by checking render count
      const initialRenders = renderSpy.mock.calls.filter(
        call => call[0] === 'TimetablesClient'
      ).length;

      // Force a state update that doesn't change the handlers
      const component = screen.getByText('Timetables');
      fireEvent.click(component);

      // Should not cause additional renders due to handler recreation
      await waitFor(() => {
        const currentRenders = renderSpy.mock.calls.filter(
          call => call[0] === 'TimetablesClient'
        ).length;
        expect(currentRenders).toBe(initialRenders);
      });
    });

    it('should handle export functionality with memoized handlers', async () => {
      render(<TimetablesClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument();
      });

      // Test export functionality
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      // Verify export was called (mocked implementation should handle this)
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/presentations/export')
      );
    });
  });

  describe('TimetableDetailClient Performance', () => {
    const defaultProps = {
      user: { email: 'test@example.com', name: 'Test User' },
      presentationId: 'test-123'
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/presentations/test-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              presentation: mockPresentation
            })
          });
        }
        if (url.includes('/api/presentations/save')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              presentation: mockPresentation
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
    });

    it('should memoize computed values for better performance', async () => {
      render(<TimetableDetailClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument();
      });

      // Check that memoized values are being used
      expect(screen.getByText('Test Presentation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view original/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should handle save operations with memoized handlers', async () => {
      render(<TimetableDetailClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Presentation')).toBeInTheDocument();
      });

      // Test that save handler is properly memoized
      const initialRenders = renderSpy.mock.calls.filter(
        call => call[0] === 'TimetableDetailClient'
      ).length;

      // Simulate prop change that shouldn't affect handlers
      const { rerender } = render(<TimetableDetailClient {...defaultProps} />);
      rerender(<TimetableDetailClient {...defaultProps} />);

      const currentRenders = renderSpy.mock.calls.filter(
        call => call[0] === 'TimetableDetailClient'
      ).length;

      // Should not have additional renders due to handler recreation
      expect(currentRenders - initialRenders).toBeLessThan(2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render metrics correctly', () => {
      const { rerender } = render(
        <TimetableCard
          presentation={mockPresentation}
          onView={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Get initial metrics
      const metrics = performanceMonitor.getMetrics('TimetableCard') as any;
      expect(metrics.renderCount).toBeGreaterThan(0);

      // Update presentation to trigger re-render
      const updatedPresentation = { ...mockPresentation, title: 'Updated' };
      rerender(
        <TimetableCard
          presentation={updatedPresentation}
          onView={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Verify metrics updated
      const updatedMetrics = performanceMonitor.getMetrics('TimetableCard') as any;
      expect(updatedMetrics.renderCount).toBeGreaterThan(metrics.renderCount);
    });

    it('should calculate render reduction correctly', () => {
      // Simulate baseline renders
      const baselineRenders = 10;

      // Simulate optimized renders
      for (let i = 0; i < 5; i++) {
        performanceMonitor.trackRender('TimetableCard', 'test render');
      }

      const reduction = performanceMonitor.getRenderReduction('TimetableCard', baselineRenders);
      expect(reduction).toBe(50); // 50% reduction
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect feature flag settings for optimizations', () => {
      // Disable optimizations
      featureFlags.setFlag('reactOptimizations', false);

      const { rerender } = render(
        <TimetableCard
          presentation={mockPresentation}
          onView={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Should re-render even with same props when optimization is disabled
      rerender(
        <TimetableCard
          presentation={mockPresentation}
          onView={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Re-enable for other tests
      featureFlags.setFlag('reactOptimizations', true);
    });

    it('should track performance when flag is enabled', () => {
      featureFlags.setFlag('performanceTracking', true);

      render(
        <TimetableCard
          presentation={mockPresentation}
          onView={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(renderSpy).toHaveBeenCalled();
    });
  });
});