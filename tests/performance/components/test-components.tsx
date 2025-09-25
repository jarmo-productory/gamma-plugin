/**
 * Test components for React optimization benchmarking
 * These components test various optimization scenarios
 */

import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useRenderTracker } from '../utils/render-tracker';

// Types for test data
export interface ListItem {
  id: number;
  name: string;
  value: number;
  category: string;
  isActive: boolean;
}

export interface TestComponentProps {
  items: ListItem[];
  onItemClick?: (item: ListItem) => void;
  filter?: string;
  sortBy?: 'name' | 'value' | 'category';
  showInactive?: boolean;
}

/**
 * Baseline component - No optimizations
 */
export function BaselineListComponent({ items, onItemClick, filter, sortBy, showInactive }: TestComponentProps) {
  const renderCount = useRenderTracker('BaselineListComponent', { items, filter, sortBy, showInactive });

  // Expensive filtering and sorting operations (not memoized)
  const processedItems = items
    .filter(item => {
      if (!showInactive && !item.isActive) return false;
      if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  // Not using useCallback - creates new function on every render
  const handleItemClick = (item: ListItem) => {
    onItemClick?.(item);
  };

  return (
    <div data-testid="baseline-list" data-render-count={renderCount}>
      <div className="list-header">
        Items: {processedItems.length} (Renders: {renderCount})
      </div>
      <div className="list-container">
        {processedItems.map(item => (
          <BaselineListItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Baseline list item - No optimizations
 */
function BaselineListItem({ item, onClick }: { item: ListItem; onClick: (item: ListItem) => void }) {
  const renderCount = useRenderTracker('BaselineListItem', { item });

  return (
    <div
      className="list-item"
      onClick={() => onClick(item)}
      data-render-count={renderCount}
    >
      <span className="item-name">{item.name}</span>
      <span className="item-value">{item.value}</span>
      <span className="item-category">{item.category}</span>
      <span className="render-count">R: {renderCount}</span>
    </div>
  );
}

/**
 * Memo optimized component
 */
export const MemoizedListComponent = memo(function MemoizedListComponent({
  items,
  onItemClick,
  filter,
  sortBy,
  showInactive
}: TestComponentProps) {
  const renderCount = useRenderTracker('MemoizedListComponent', { items, filter, sortBy, showInactive });

  // Still not memoized - will cause re-renders
  const processedItems = items
    .filter(item => {
      if (!showInactive && !item.isActive) return false;
      if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  const handleItemClick = (item: ListItem) => {
    onItemClick?.(item);
  };

  return (
    <div data-testid="memoized-list" data-render-count={renderCount}>
      <div className="list-header">
        Items: {processedItems.length} (Renders: {renderCount})
      </div>
      <div className="list-container">
        {processedItems.map(item => (
          <MemoizedListItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Memo optimized list item
 */
const MemoizedListItem = memo(function MemoizedListItem({
  item,
  onClick
}: {
  item: ListItem;
  onClick: (item: ListItem) => void
}) {
  const renderCount = useRenderTracker('MemoizedListItem', { item });

  return (
    <div
      className="list-item"
      onClick={() => onClick(item)}
      data-render-count={renderCount}
    >
      <span className="item-name">{item.name}</span>
      <span className="item-value">{item.value}</span>
      <span className="item-category">{item.category}</span>
      <span className="render-count">R: {renderCount}</span>
    </div>
  );
});

/**
 * Callback optimized component
 */
export const CallbackOptimizedListComponent = memo(function CallbackOptimizedListComponent({
  items,
  onItemClick,
  filter,
  sortBy,
  showInactive
}: TestComponentProps) {
  const renderCount = useRenderTracker('CallbackOptimizedListComponent', { items, filter, sortBy, showInactive });

  // Still not memoized processing
  const processedItems = items
    .filter(item => {
      if (!showInactive && !item.isActive) return false;
      if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  // Using useCallback for optimization
  const handleItemClick = useCallback((item: ListItem) => {
    onItemClick?.(item);
  }, [onItemClick]);

  return (
    <div data-testid="callback-optimized-list" data-render-count={renderCount}>
      <div className="list-header">
        Items: {processedItems.length} (Renders: {renderCount})
      </div>
      <div className="list-container">
        {processedItems.map(item => (
          <CallbackOptimizedListItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Callback optimized list item
 */
const CallbackOptimizedListItem = memo(function CallbackOptimizedListItem({
  item,
  onClick
}: {
  item: ListItem;
  onClick: (item: ListItem) => void
}) {
  const renderCount = useRenderTracker('CallbackOptimizedListItem', { item });

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <div
      className="list-item"
      onClick={handleClick}
      data-render-count={renderCount}
    >
      <span className="item-name">{item.name}</span>
      <span className="item-value">{item.value}</span>
      <span className="item-category">{item.category}</span>
      <span className="render-count">R: {renderCount}</span>
    </div>
  );
});

/**
 * Fully optimized component - memo + useMemo + useCallback
 */
export const FullyOptimizedListComponent = memo(function FullyOptimizedListComponent({
  items,
  onItemClick,
  filter,
  sortBy,
  showInactive
}: TestComponentProps) {
  const renderCount = useRenderTracker('FullyOptimizedListComponent', { items, filter, sortBy, showInactive });

  // Memoized processing - only recalculates when dependencies change
  const processedItems = useMemo(() => {
    return items
      .filter(item => {
        if (!showInactive && !item.isActive) return false;
        if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'value') return b.value - a.value;
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        return 0;
      });
  }, [items, filter, sortBy, showInactive]);

  // Memoized callback
  const handleItemClick = useCallback((item: ListItem) => {
    onItemClick?.(item);
  }, [onItemClick]);

  return (
    <div data-testid="fully-optimized-list" data-render-count={renderCount}>
      <div className="list-header">
        Items: {processedItems.length} (Renders: {renderCount})
      </div>
      <div className="list-container">
        {processedItems.map(item => (
          <FullyOptimizedListItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Fully optimized list item
 */
const FullyOptimizedListItem = memo(function FullyOptimizedListItem({
  item,
  onClick
}: {
  item: ListItem;
  onClick: (item: ListItem) => void
}) {
  const renderCount = useRenderTracker('FullyOptimizedListItem', { item });

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <div
      className="list-item"
      onClick={handleClick}
      data-render-count={renderCount}
    >
      <span className="item-name">{item.name}</span>
      <span className="item-value">{item.value}</span>
      <span className="item-category">{item.category}</span>
      <span className="render-count">R: {renderCount}</span>
    </div>
  );
});

/**
 * Test harness component for performance testing
 */
export function PerformanceTestHarness() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'category'>('name');
  const [showInactive, setShowInactive] = useState(true);
  const [currentComponent, setCurrentComponent] = useState<'baseline' | 'memo' | 'callback' | 'full'>('baseline');
  const [itemCount, setItemCount] = useState(1000);

  // Generate test data
  const generateItems = useCallback((count: number) => {
    const categories = ['Electronics', 'Books', 'Clothing', 'Home', 'Sports'];
    const names = ['Item', 'Product', 'Widget', 'Gadget', 'Tool'];

    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: `${names[index % names.length]} ${index + 1}`,
      value: Math.floor(Math.random() * 1000) + 1,
      category: categories[index % categories.length],
      isActive: Math.random() > 0.3, // 70% active
    }));
  }, []);

  useEffect(() => {
    setItems(generateItems(itemCount));
  }, [itemCount, generateItems]);

  const handleItemClick = useCallback((item: ListItem) => {
    console.log('Item clicked:', item.name);
  }, []);

  const renderCurrentComponent = () => {
    const props = {
      items,
      onItemClick: handleItemClick,
      filter,
      sortBy,
      showInactive,
    };

    switch (currentComponent) {
      case 'baseline':
        return <BaselineListComponent {...props} />;
      case 'memo':
        return <MemoizedListComponent {...props} />;
      case 'callback':
        return <CallbackOptimizedListComponent {...props} />;
      case 'full':
        return <FullyOptimizedListComponent {...props} />;
      default:
        return <BaselineListComponent {...props} />;
    }
  };

  return (
    <div data-testid="performance-test-harness">
      <div className="controls">
        <div className="control-group">
          <label>
            Component Type:
            <select value={currentComponent} onChange={e => setCurrentComponent(e.target.value as any)}>
              <option value="baseline">Baseline (No optimization)</option>
              <option value="memo">React.memo</option>
              <option value="callback">useCallback</option>
              <option value="full">Fully Optimized</option>
            </select>
          </label>
        </div>

        <div className="control-group">
          <label>
            Item Count:
            <select value={itemCount} onChange={e => setItemCount(Number(e.target.value))}>
              <option value={100}>100 items</option>
              <option value={500}>500 items</option>
              <option value={1000}>1,000 items</option>
              <option value={5000}>5,000 items</option>
              <option value={10000}>10,000 items</option>
            </select>
          </label>
        </div>

        <div className="control-group">
          <label>
            Filter:
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter items..."
            />
          </label>
        </div>

        <div className="control-group">
          <label>
            Sort by:
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="name">Name</option>
              <option value="value">Value</option>
              <option value="category">Category</option>
            </select>
          </label>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Show inactive items
          </label>
        </div>
      </div>

      <div className="component-container">
        {renderCurrentComponent()}
      </div>
    </div>
  );
}