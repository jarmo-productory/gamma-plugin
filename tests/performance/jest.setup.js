/**
 * Jest setup for React performance tests
 * Configures testing environment with necessary mocks and utilities
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock performance API for consistent testing
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 10 }]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000,
  },
};

Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance,
});

// Mock PerformanceObserver
global.PerformanceObserver = class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock IntersectionObserver for virtualization tests
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
};

// Enhanced console methods for performance logging
const originalConsole = { ...console };

console.warn = jest.fn((...args) => {
  if (process.env.NODE_ENV !== 'test') {
    originalConsole.warn(...args);
  }
});

console.log = jest.fn((...args) => {
  if (process.env.NODE_ENV !== 'test') {
    originalConsole.log(...args);
  }
});

// Mock memory management functions
global.gc = jest.fn();

// Setup test utilities
beforeEach(() => {
  // Reset performance mocks
  mockPerformance.now.mockClear();
  mockPerformance.mark.mockClear();
  mockPerformance.measure.mockClear();
  mockPerformance.getEntriesByName.mockClear();
  mockPerformance.clearMarks.mockClear();
  mockPerformance.clearMeasures.mockClear();

  // Reset time for consistent testing
  mockPerformance.now.mockImplementation(() => Date.now());

  // Clear console mocks
  console.warn.mockClear();
  console.log.mockClear();

  // Clear any global test state
  if (global.__performanceReport) {
    delete global.__performanceReport;
  }
  if (global.__validationResults) {
    delete global.__validationResults;
  }
});

// Cleanup after each test
afterEach(() => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global test timeout
jest.setTimeout(30000);

// Add custom matchers for performance testing
expect.extend({
  toBeWithinPerformanceThreshold(received, expected, threshold = 0.1) {
    const pass = Math.abs(received - expected) / expected <= threshold;

    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within ${threshold * 100}% of ${expected}`,
        pass: true,
      };
    } else {
      const difference = Math.abs(received - expected);
      const percentDiff = (difference / expected) * 100;

      return {
        message: () =>
          `expected ${received} to be within ${threshold * 100}% of ${expected}, but difference was ${percentDiff.toFixed(2)}%`,
        pass: false,
      };
    }
  },

  toHaveReasonableRenderCount(received, maxCount = 50) {
    const pass = received <= maxCount;

    if (pass) {
      return {
        message: () =>
          `expected ${received} renders to exceed ${maxCount}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} renders to be <= ${maxCount}, indicating potential performance issues`,
        pass: false,
      };
    }
  },

  toHaveFastRenderTime(received, maxTime = 16.67) {
    const pass = received <= maxTime;

    if (pass) {
      return {
        message: () =>
          `expected render time ${received}ms to exceed ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected render time ${received}ms to be <= ${maxTime}ms (60fps threshold)`,
        pass: false,
      };
    }
  },
});

// Error boundary for catching React errors in tests
class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Test Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        'data-testid': 'error-boundary'
      }, `Error: ${this.state.error?.message || 'Unknown error'}`);
    }

    return this.props.children;
  }
}

global.TestErrorBoundary = TestErrorBoundary;

// Utility function to wrap components in error boundary
global.withErrorBoundary = (component) => {
  return React.createElement(TestErrorBoundary, {}, component);
};

// Memory tracking utilities for tests
global.trackMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
  };
};

// Performance tracking utilities
global.measureTestPerformance = (testName, fn) => {
  const startTime = performance.now();
  const startMemory = global.trackMemoryUsage();

  const result = fn();

  const endTime = performance.now();
  const endMemory = global.trackMemoryUsage();

  const duration = endTime - startTime;
  const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

  console.log(`Performance for ${testName}:`, {
    duration: `${duration.toFixed(2)}ms`,
    memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
  });

  return { result, duration, memoryDelta };
};