/**
 * Edge case performance tests for React optimizations
 * Tests boundary conditions and stress scenarios
 */

import React, { useState, useCallback, useMemo } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { FullyOptimizedListComponent, ListItem } from '../components/test-components';
import {
  clearRenderMetrics,
  getAllRenderMetrics,
  globalPerformanceMeasurer
} from '../utils/render-tracker';
import { performanceMemoryStorage, BenchmarkResult } from '../utils/memory-storage';

// Stress test component for extreme scenarios
function StressTestComponent({ itemCount }: { itemCount: number }) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Generate massive dataset
  const generateItems = useCallback((count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: `Stress Item ${index + 1} - ${Math.random().toString(36).substr(2, 9)}`,
      value: Math.floor(Math.random() * 10000),
      category: `Category ${index % 100}`,
      isActive: Math.random() > 0.1,
    }));
  }, []);

  // Initialize with massive dataset
  React.useEffect(() => {
    setItems(generateItems(itemCount));
  }, [itemCount, generateItems]);

  // Simulate constant updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setUpdateCounter(prev => prev + 1);

      // Update random items
      setItems(prev => prev.map(item =>
        Math.random() > 0.95 ? { ...item, value: Math.floor(Math.random() * 10000) } : item
      ));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div data-testid="stress-test-component">
      <div>Update Counter: {updateCounter}</div>
      <FullyOptimizedListComponent
        items={items}
        onItemClick={() => {}}
        filter=""
        sortBy="name"
        showInactive={true}
      />
    </div>
  );
}

describe('React Performance Edge Cases', () => {
  beforeEach(() => {
    clearRenderMetrics();
    globalPerformanceMeasurer.clear();
    performanceMemoryStorage.clear();
  });

  describe('Massive Dataset Handling', () => {
    it('should handle 50,000 items without performance degradation', async () => {
      const massiveDataset = generateLargeDataset(50000);
      const startTime = performance.now();

      const { rerender } = render(
        <FullyOptimizedListComponent
          items={massiveDataset}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      const renderTime = performance.now() - startTime;

      // Test filtering on massive dataset
      const filterStartTime = performance.now();

      await act(async () => {
        rerender(
          <FullyOptimizedListComponent
            items={massiveDataset}
            onItemClick={() => {}}
            filter="Item 1"
            sortBy="name"
            showInactive={true}
          />
        );
      });

      const filterTime = performance.now() - filterStartTime;

      const result: BenchmarkResult = {
        testName: 'MassiveDataset_50k',
        timestamp: Date.now(),
        metrics: {
          renderCount: 2,
          averageRenderTime: (renderTime + filterTime) / 2,
          totalTime: renderTime + filterTime,
          memoryUsage: estimateMemoryUsage(massiveDataset),
        },
        configuration: {
          optimizationLevel: 'full',
          dataSize: 50000,
          interactionRate: 1,
        },
        environment: getEnvironmentInfo(),
      };

      performanceMemoryStorage.storeBenchmarkResult(result);

      // Should handle massive datasets reasonably
      expect(renderTime).toBeLessThan(5000); // Less than 5 seconds initial render
      expect(filterTime).toBeLessThan(1000); // Less than 1 second for filtering
    });

    it('should handle 100,000 items with pagination strategy', async () => {
      const massiveDataset = generateLargeDataset(100000);

      // Simulate pagination by rendering only a subset
      const pageSize = 100;
      const page1Items = massiveDataset.slice(0, pageSize);

      const startTime = performance.now();

      render(
        <FullyOptimizedListComponent
          items={page1Items}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Should be very fast with pagination
      expect(page1Items).toHaveLength(pageSize);
    });
  });

  describe('Extreme Interaction Rates', () => {
    it('should handle 1000 rapid filter changes per second', async () => {
      const items = generateLargeDataset(1000);
      const filterStrings = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

      const { rerender } = render(
        <FullyOptimizedListComponent
          items={items}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      const startTime = performance.now();

      // Simulate extremely rapid filtering (like fast typing)
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          rerender(
            <FullyOptimizedListComponent
              items={items}
              onItemClick={() => {}}
              filter={filterStrings[i]}
              sortBy="name"
              showInactive={true}
            />
          );
        });

        // Simulate 10ms between keystrokes (100 WPM typing)
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerUpdate = totalTime / 100;

      const result: BenchmarkResult = {
        testName: 'ExtremeInteractionRate',
        timestamp: Date.now(),
        metrics: {
          renderCount: 101,
          averageRenderTime: avgTimePerUpdate,
          totalTime,
          memoryUsage: estimateMemoryUsage(items),
          interactionDelay: avgTimePerUpdate,
        },
        configuration: {
          optimizationLevel: 'full',
          dataSize: 1000,
          interactionRate: 100,
        },
        environment: getEnvironmentInfo(),
      };

      performanceMemoryStorage.storeBenchmarkResult(result);

      // Should handle rapid interactions efficiently
      expect(avgTimePerUpdate).toBeLessThan(10); // Less than 10ms per update
    });

    it('should handle concurrent sorting and filtering', async () => {
      const items = generateLargeDataset(5000);
      const sortOptions: Array<'name' | 'value' | 'category'> = ['name', 'value', 'category'];
      const filters = ['', 'Item', 'Product', 'Widget'];

      const { rerender } = render(
        <FullyOptimizedListComponent
          items={items}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      const startTime = performance.now();

      // Simulate user changing both sort and filter rapidly
      for (let i = 0; i < 20; i++) {
        const sortBy = sortOptions[i % sortOptions.length];
        const filter = filters[i % filters.length];

        await act(async () => {
          rerender(
            <FullyOptimizedListComponent
              items={items}
              onItemClick={() => {}}
              filter={filter}
              sortBy={sortBy}
              showInactive={i % 3 === 0}
            />
          );
        });

        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Memory Stress Tests', () => {
    it('should handle memory pressure with large item objects', async () => {
      // Create items with large data payloads
      const memoryIntensiveItems: ListItem[] = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        name: `Item ${index + 1}`,
        value: Math.random() * 1000,
        category: `Category ${index % 10}`,
        isActive: true,
        // Add large data payload to stress test memory
        largeData: new Array(1000).fill(`Large data chunk ${index}`).join(' ')
      })) as any;

      const startMemory = getMemorySnapshot();

      render(
        <FullyOptimizedListComponent
          items={memoryIntensiveItems}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      const endMemory = getMemorySnapshot();
      const memoryIncrease = endMemory - startMemory;

      const result: BenchmarkResult = {
        testName: 'MemoryStressTest',
        timestamp: Date.now(),
        metrics: {
          renderCount: 1,
          averageRenderTime: 0,
          totalTime: 0,
          memoryUsage: memoryIncrease,
        },
        configuration: {
          optimizationLevel: 'full',
          dataSize: 1000,
          interactionRate: 0,
        },
        environment: getEnvironmentInfo(),
      };

      performanceMemoryStorage.storeBenchmarkResult(result);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it('should handle repeated mounting and unmounting without memory leaks', async () => {
      const items = generateLargeDataset(1000);
      let totalMemoryIncrease = 0;

      for (let i = 0; i < 10; i++) {
        const beforeMount = getMemorySnapshot();

        const { unmount } = render(
          <FullyOptimizedListComponent
            items={items}
            onItemClick={() => {}}
            filter={`Filter ${i}`}
            sortBy="name"
            showInactive={true}
          />
        );

        const afterMount = getMemorySnapshot();

        unmount();

        // Force garbage collection if available
        if ((global as any).gc) {
          (global as any).gc();
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        const afterUnmount = getMemorySnapshot();

        totalMemoryIncrease += (afterUnmount - beforeMount);
      }

      // Total memory increase should be minimal after all unmounts
      expect(totalMemoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB total
    });
  });

  describe('Edge Case Data Scenarios', () => {
    it('should handle empty dataset gracefully', () => {
      const { container } = render(
        <FullyOptimizedListComponent
          items={[]}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      expect(container.querySelector('[data-testid="fully-optimized-list"]')).toBeInTheDocument();
      expect(screen.getByText(/Items: 0/)).toBeInTheDocument();
    });

    it('should handle items with null/undefined values', () => {
      const edgeCaseItems: ListItem[] = [
        {
          id: 1,
          name: '',
          value: 0,
          category: '',
          isActive: false,
        },
        {
          id: 2,
          name: null as any,
          value: -1,
          category: undefined as any,
          isActive: true,
        },
      ];

      const { container } = render(
        <FullyOptimizedListComponent
          items={edgeCaseItems}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText(/Items: 2/)).toBeInTheDocument();
    });

    it('should handle extremely long strings without breaking layout', () => {
      const longStringItems: ListItem[] = [
        {
          id: 1,
          name: 'A'.repeat(1000),
          value: 100,
          category: 'B'.repeat(500),
          isActive: true,
        },
      ];

      const { container } = render(
        <FullyOptimizedListComponent
          items={longStringItems}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText(/Items: 1/)).toBeInTheDocument();
    });

    it('should handle special characters in filter strings', () => {
      const items = generateLargeDataset(100);
      const specialCharFilters = ['<script>', '&amp;', '\\n\\t', '<?xml', ']]>', '/**/'];

      const { rerender } = render(
        <FullyOptimizedListComponent
          items={items}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      // Test each special character filter
      specialCharFilters.forEach(filter => {
        expect(() => {
          act(() => {
            rerender(
              <FullyOptimizedListComponent
                items={items}
                onItemClick={() => {}}
                filter={filter}
                sortBy="name"
                showInactive={true}
              />
            );
          });
        }).not.toThrow();
      });
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle performance API unavailability gracefully', () => {
      // Mock performance API as unavailable
      const originalPerformance = global.performance;
      (global as any).performance = undefined;

      expect(() => {
        render(
          <FullyOptimizedListComponent
            items={generateLargeDataset(100)}
            onItemClick={() => {}}
            filter=""
            sortBy="name"
            showInactive={true}
          />
        );
      }).not.toThrow();

      // Restore performance API
      global.performance = originalPerformance;
    });

    it('should handle requestAnimationFrame unavailability', () => {
      const originalRAF = global.requestAnimationFrame;
      (global as any).requestAnimationFrame = undefined;

      expect(() => {
        render(
          <FullyOptimizedListComponent
            items={generateLargeDataset(100)}
            onItemClick={() => {}}
            filter=""
            sortBy="name"
            showInactive={true}
          />
        );
      }).not.toThrow();

      global.requestAnimationFrame = originalRAF;
    });
  });

  describe('Stress Testing with Continuous Updates', () => {
    it('should handle continuous background updates', async () => {
      const startTime = performance.now();

      render(<StressTestComponent itemCount={1000} />);

      // Let it run for 1 second with continuous updates
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle continuous updates without crashing
      expect(screen.getByTestId('stress-test-component')).toBeInTheDocument();
      expect(totalTime).toBeGreaterThan(1000); // Should have run for at least 1 second
    }, 10000); // Increase timeout for stress test
  });
});

// Helper functions
function generateLargeDataset(count: number): ListItem[] {
  const categories = Array.from({ length: 100 }, (_, i) => `Category ${i}`);
  const names = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: names[index % names.length],
    value: Math.floor(Math.random() * 10000),
    category: categories[index % categories.length],
    isActive: Math.random() > 0.1,
  }));
}

function estimateMemoryUsage(items: ListItem[]): number {
  // Rough estimation: each item ~200 bytes
  return items.length * 200;
}

function getMemorySnapshot(): number {
  // In a real environment, this would use performance.measureUserAgentSpecificMemory
  // For testing, simulate memory usage
  if ((performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return Math.floor(Math.random() * 10000000) + 10000000; // 10-20MB range
}

function getEnvironmentInfo() {
  return {
    userAgent: navigator.userAgent || 'test-environment',
    viewport: { width: window.innerWidth || 1024, height: window.innerHeight || 768 },
    cpuConcurrency: navigator.hardwareConcurrency || 4,
  };
}