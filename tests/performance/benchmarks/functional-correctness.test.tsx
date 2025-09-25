/**
 * Functional correctness validation after optimization changes
 * Ensures optimizations don't break functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import {
  BaselineListComponent,
  MemoizedListComponent,
  CallbackOptimizedListComponent,
  FullyOptimizedListComponent,
  PerformanceTestHarness,
  ListItem
} from '../components/test-components';
import { performanceMemoryStorage } from '../utils/memory-storage';

describe('Functional Correctness Validation', () => {
  const testItems: ListItem[] = [
    { id: 1, name: 'Apple', value: 100, category: 'Fruit', isActive: true },
    { id: 2, name: 'Banana', value: 80, category: 'Fruit', isActive: true },
    { id: 3, name: 'Carrot', value: 50, category: 'Vegetable', isActive: false },
    { id: 4, name: 'Date', value: 120, category: 'Fruit', isActive: true },
    { id: 5, name: 'Eggplant', value: 60, category: 'Vegetable', isActive: true },
  ];

  beforeEach(() => {
    performanceMemoryStorage.clear();
  });

  describe('Component Rendering Correctness', () => {
    const components = [
      { name: 'Baseline', Component: BaselineListComponent, testId: 'baseline-list' },
      { name: 'Memoized', Component: MemoizedListComponent, testId: 'memoized-list' },
      { name: 'Callback Optimized', Component: CallbackOptimizedListComponent, testId: 'callback-optimized-list' },
      { name: 'Fully Optimized', Component: FullyOptimizedListComponent, testId: 'fully-optimized-list' },
    ];

    components.forEach(({ name, Component, testId }) => {
      describe(`${name} Component`, () => {
        it('should render all items correctly', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="name"
              showInactive={true}
            />
          );

          expect(screen.getByTestId(testId)).toBeInTheDocument();
          expect(screen.getByText(/Items: 5/)).toBeInTheDocument();

          // Check that all items are rendered
          testItems.forEach(item => {
            expect(screen.getByText(item.name)).toBeInTheDocument();
            expect(screen.getByText(item.value.toString())).toBeInTheDocument();
            expect(screen.getByText(item.category)).toBeInTheDocument();
          });
        });

        it('should handle empty items array', () => {
          render(
            <Component
              items={[]}
              onItemClick={() => {}}
              filter=""
              sortBy="name"
              showInactive={true}
            />
          );

          expect(screen.getByTestId(testId)).toBeInTheDocument();
          expect(screen.getByText(/Items: 0/)).toBeInTheDocument();
        });

        it('should apply filtering correctly', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter="a"
              sortBy="name"
              showInactive={true}
            />
          );

          // Should show items containing 'a': Apple, Banana, Carrot, Date, Eggplant
          expect(screen.getByText(/Items: 5/)).toBeInTheDocument();
          expect(screen.getByText('Apple')).toBeInTheDocument();
          expect(screen.getByText('Banana')).toBeInTheDocument();
          expect(screen.getByText('Carrot')).toBeInTheDocument();
          expect(screen.getByText('Date')).toBeInTheDocument();
          expect(screen.getByText('Eggplant')).toBeInTheDocument();
        });

        it('should apply case-insensitive filtering', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter="APPLE"
              sortBy="name"
              showInactive={true}
            />
          );

          expect(screen.getByText(/Items: 1/)).toBeInTheDocument();
          expect(screen.getByText('Apple')).toBeInTheDocument();
        });

        it('should hide inactive items when showInactive is false', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="name"
              showInactive={false}
            />
          );

          // Should show 4 items (excluding inactive Carrot)
          expect(screen.getByText(/Items: 4/)).toBeInTheDocument();
          expect(screen.getByText('Apple')).toBeInTheDocument();
          expect(screen.getByText('Banana')).toBeInTheDocument();
          expect(screen.queryByText('Carrot')).not.toBeInTheDocument();
          expect(screen.getByText('Date')).toBeInTheDocument();
          expect(screen.getByText('Eggplant')).toBeInTheDocument();
        });

        it('should sort by name correctly', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="name"
              showInactive={true}
            />
          );

          const items = screen.getAllByText(/^(Apple|Banana|Carrot|Date|Eggplant)$/);
          const itemNames = items.map(item => item.textContent);

          expect(itemNames).toEqual(['Apple', 'Banana', 'Carrot', 'Date', 'Eggplant']);
        });

        it('should sort by value correctly (descending)', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="value"
              showInactive={true}
            />
          );

          const values = screen.getAllByText(/^(100|80|50|120|60)$/);
          const valueNumbers = values.map(value => parseInt(value.textContent || '0'));

          // Should be sorted descending: 120, 100, 80, 60, 50
          expect(valueNumbers).toEqual([120, 100, 80, 60, 50]);
        });

        it('should sort by category correctly', () => {
          render(
            <Component
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="category"
              showInactive={true}
            />
          );

          const categories = screen.getAllByText(/^(Fruit|Vegetable)$/);
          const categoryNames = categories.map(cat => cat.textContent);

          // Fruits should come before Vegetables alphabetically
          const fruitCount = categoryNames.filter(cat => cat === 'Fruit').length;
          const vegetableCount = categoryNames.filter(cat => cat === 'Vegetable').length;

          expect(fruitCount).toBe(3);
          expect(vegetableCount).toBe(2);

          // First few should be fruits
          expect(categoryNames.slice(0, 3)).toEqual(['Fruit', 'Fruit', 'Fruit']);
        });

        it('should handle item clicks correctly', () => {
          const onItemClick = jest.fn();

          render(
            <Component
              items={testItems}
              onItemClick={onItemClick}
              filter=""
              sortBy="name"
              showInactive={true}
            />
          );

          const firstItem = screen.getByText('Apple');
          fireEvent.click(firstItem.closest('.list-item')!);

          expect(onItemClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: 1, name: 'Apple' })
          );
        });
      });
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should produce identical output across all optimization levels', () => {
      const props = {
        items: testItems,
        onItemClick: () => {},
        filter: 'a',
        sortBy: 'name' as const,
        showInactive: false,
      };

      const { container: baseline } = render(<BaselineListComponent {...props} />);
      const { container: memoized } = render(<MemoizedListComponent {...props} />);
      const { container: callback } = render(<CallbackOptimizedListComponent {...props} />);
      const { container: optimized } = render(<FullyOptimizedListComponent {...props} />);

      // Extract item names from each component
      const getItemNames = (container: HTMLElement) => {
        const itemElements = container.querySelectorAll('.item-name');
        return Array.from(itemElements).map(el => el.textContent);
      };

      const baselineItems = getItemNames(baseline);
      const memoizedItems = getItemNames(memoized);
      const callbackItems = getItemNames(callback);
      const optimizedItems = getItemNames(optimized);

      // All components should show identical results
      expect(memoizedItems).toEqual(baselineItems);
      expect(callbackItems).toEqual(baselineItems);
      expect(optimizedItems).toEqual(baselineItems);
    });

    it('should maintain state correctly across re-renders', async () => {
      const onItemClick = jest.fn();

      const { rerender } = render(
        <FullyOptimizedListComponent
          items={testItems}
          onItemClick={onItemClick}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      // Initial state
      expect(screen.getByText(/Items: 5/)).toBeInTheDocument();

      // Update filter
      await act(async () => {
        rerender(
          <FullyOptimizedListComponent
            items={testItems}
            onItemClick={onItemClick}
            filter="Fruit"
            sortBy="name"
            showInactive={true}
          />
        );
      });

      // Should filter correctly
      expect(screen.queryByText(/Items: 0/)).toBeInTheDocument(); // "Fruit" is in category, not name

      // Update filter to match names
      await act(async () => {
        rerender(
          <FullyOptimizedListComponent
            items={testItems}
            onItemClick={onItemClick}
            filter="a"
            sortBy="name"
            showInactive={true}
          />
        );
      });

      expect(screen.getByText(/Items: 5/)).toBeInTheDocument();

      // Change sort order
      await act(async () => {
        rerender(
          <FullyOptimizedListComponent
            items={testItems}
            onItemClick={onItemClick}
            filter="a"
            sortBy="value"
            showInactive={true}
          />
        );
      });

      // Should still show all items with 'a'
      expect(screen.getByText(/Items: 5/)).toBeInTheDocument();

      // Click should still work
      const firstVisibleItem = screen.getAllByText(/Apple|Date/)[0]; // Date has highest value (120)
      fireEvent.click(firstVisibleItem.closest('.list-item')!);

      expect(onItemClick).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined props gracefully', () => {
      const { container } = render(
        <FullyOptimizedListComponent
          items={testItems}
          onItemClick={undefined}
          filter={undefined as any}
          sortBy={undefined as any}
          showInactive={undefined as any}
        />
      );

      // Should still render without crashing
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle malformed item data', () => {
      const malformedItems: ListItem[] = [
        { id: 1, name: null as any, value: NaN, category: undefined as any, isActive: true },
        { id: 2, name: '', value: -1, category: '', isActive: false },
        { id: 3, name: 'Valid Item', value: 100, category: 'Valid Category', isActive: true },
      ];

      const { container } = render(
        <FullyOptimizedListComponent
          items={malformedItems}
          onItemClick={() => {}}
          filter=""
          sortBy="name"
          showInactive={true}
        />
      );

      // Should render without crashing
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Valid Item')).toBeInTheDocument();
    });

    it('should handle extremely large numbers', () => {
      const extremeItems: ListItem[] = [
        { id: 1, name: 'Max Safe Integer', value: Number.MAX_SAFE_INTEGER, category: 'Test', isActive: true },
        { id: 2, name: 'Negative', value: -999999999, category: 'Test', isActive: true },
        { id: 3, name: 'Zero', value: 0, category: 'Test', isActive: true },
      ];

      const { container } = render(
        <FullyOptimizedListComponent
          items={extremeItems}
          onItemClick={() => {}}
          filter=""
          sortBy="value"
          showInactive={true}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Max Safe Integer')).toBeInTheDocument();
    });
  });

  describe('Performance Test Harness Validation', () => {
    it('should switch between component types correctly', async () => {
      const { container } = render(<PerformanceTestHarness />);

      expect(screen.getByTestId('performance-test-harness')).toBeInTheDocument();

      // Should start with baseline
      expect(container.querySelector('[data-testid="baseline-list"]')).toBeInTheDocument();

      // Switch to memoized
      const componentSelect = screen.getByDisplayValue('Baseline (No optimization)');
      fireEvent.change(componentSelect, { target: { value: 'memo' } });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="memoized-list"]')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="baseline-list"]')).not.toBeInTheDocument();
      });

      // Switch to fully optimized
      fireEvent.change(componentSelect, { target: { value: 'full' } });

      await waitFor(() => {
        expect(container.querySelector('[data-testid="fully-optimized-list"]')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="memoized-list"]')).not.toBeInTheDocument();
      });
    });

    it('should update item count correctly', async () => {
      render(<PerformanceTestHarness />);

      const itemCountSelect = screen.getByDisplayValue('1,000 items');

      // Change to 5000 items
      fireEvent.change(itemCountSelect, { target: { value: '5000' } });

      await waitFor(() => {
        // Should show more items (exact count may vary based on filtering)
        expect(screen.getByText(/Items: \d+/)).toBeInTheDocument();
      });
    });

    it('should apply filters and sorting from controls', async () => {
      render(<PerformanceTestHarness />);

      // Apply filter
      const filterInput = screen.getByPlaceholderText('Filter items...');
      fireEvent.change(filterInput, { target: { value: 'Item 1' } });

      await waitFor(() => {
        expect(screen.getByText(/Items: \d+/)).toBeInTheDocument();
      });

      // Change sorting
      const sortSelect = screen.getByDisplayValue('Name');
      fireEvent.change(sortSelect, { target: { value: 'value' } });

      await waitFor(() => {
        // Should still show filtered items
        expect(screen.getByText(/Items: \d+/)).toBeInTheDocument();
      });

      // Toggle inactive items
      const showInactiveCheckbox = screen.getByRole('checkbox');
      fireEvent.click(showInactiveCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/Items: \d+/)).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Validation', () => {
    it('should not leak memory with repeated renders', async () => {
      const TestComponent = () => {
        const [key, setKey] = React.useState(0);

        return (
          <div>
            <button onClick={() => setKey(k => k + 1)}>Re-render</button>
            <FullyOptimizedListComponent
              key={key}
              items={testItems}
              onItemClick={() => {}}
              filter=""
              sortBy="name"
              showInactive={true}
            />
          </div>
        );
      };

      render(<TestComponent />);

      const rerenderButton = screen.getByText('Re-render');

      // Force multiple re-renders
      for (let i = 0; i < 10; i++) {
        fireEvent.click(rerenderButton);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        });
      }

      // Should still be functional
      expect(screen.getByText(/Items: 5/)).toBeInTheDocument();
    });

    it('should maintain functionality under rapid prop changes', async () => {
      const RapidChangeComponent = () => {
        const [filter, setFilter] = React.useState('');
        const [sortBy, setSortBy] = React.useState<'name' | 'value' | 'category'>('name');

        React.useEffect(() => {
          const interval = setInterval(() => {
            setFilter(f => f === '' ? 'a' : '');
            setSortBy(s => s === 'name' ? 'value' : 'name');
          }, 10);

          return () => clearInterval(interval);
        }, []);

        return (
          <FullyOptimizedListComponent
            items={testItems}
            onItemClick={() => {}}
            filter={filter}
            sortBy={sortBy}
            showInactive={true}
          />
        );
      };

      render(<RapidChangeComponent />);

      // Let it run for a short period
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should still be rendering correctly
      expect(screen.getByText(/Items: \d+/)).toBeInTheDocument();
    }, 10000);
  });
});

// Helper function to store validation results in memory
function storeValidationResults(testName: string, passed: boolean, details: any) {
  const validationData = {
    testName,
    passed,
    timestamp: Date.now(),
    details,
  };

  // Store in global memory for access by other tests
  if (!(global as any).__validationResults) {
    (global as any).__validationResults = [];
  }

  (global as any).__validationResults.push(validationData);

  console.log(`Validation result for ${testName}:`, passed ? 'PASSED' : 'FAILED', details);
}