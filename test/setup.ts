// Global test setup
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test case
beforeEach(() => {
  cleanup();
});

// Mock Chrome APIs globally
global.chrome = {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
  },
  tabs: {
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
} as any;

// Global setup
beforeAll(() => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  });

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock fetch globally
global.fetch = vi.fn();

// Global teardown
afterAll(() => {
  // Clean up any global mocks or resources
  vi.clearAllMocks();
});

// Increase timeout for slow tests
vi.setConfig({ testTimeout: 10000 });