# Sprint 4: Implementation Patterns Proposal

**Created:** 2025-08-16T10:00:00Z  
**Status:** PROPOSAL - Awaiting Team Review & Approval  
**Based on:** Tech Lead architectural decisions and current vanilla JS codebase analysis

## Executive Summary

This proposal establishes concrete implementation patterns for Sprint 4 based on the Tech Lead's decision to maintain Netlify Functions as primary API and continue vanilla JS approach. The patterns address architectural inconsistencies discovered in Sprint 3 while building on proven production-ready foundations.

### Key Architectural Decisions Implemented

1. **API Strategy**: Netlify Functions remain primary backend (11 functions operational)
2. **Frontend Approach**: Enhance vanilla JS with structured patterns, defer React migration to Sprint 5+
3. **State Management**: Implement centralized StateManager using existing localStorage patterns
4. **Error Handling**: Standardize across client-server boundary with user-facing messages
5. **Type Safety**: Improve TypeScript usage within current vanilla JS constraints

## 1. Component Patterns

### Current System Analysis

**Existing `h()` Helper Function** (`packages/web/src/main-clerk-sdk.js` lines 7-19):
```javascript
function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  // ... children handling
  return el;
}
```

### Enhanced Component Pattern

**File**: `/packages/shared/ui/component-base.ts`

```typescript
export interface ComponentProps {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  onClick?: (event: Event) => void;
  onMount?: (element: HTMLElement) => void;
  children?: (HTMLElement | string)[];
  [key: string]: any;
}

export interface ComponentState {
  [key: string]: any;
}

export abstract class Component<TProps extends ComponentProps = ComponentProps, TState extends ComponentState = ComponentState> {
  protected element: HTMLElement | null = null;
  protected props: TProps;
  protected state: TState;
  private mounted = false;

  constructor(props: TProps, initialState: TState) {
    this.props = props;
    this.state = initialState;
  }

  abstract render(): HTMLElement;

  mount(container: HTMLElement): void {
    if (this.mounted) {
      console.warn('Component already mounted');
      return;
    }

    this.element = this.render();
    container.appendChild(this.element);
    this.mounted = true;

    if (this.props.onMount) {
      this.props.onMount(this.element);
    }
  }

  unmount(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.mounted = false;
    this.element = null;
  }

  setState(newState: Partial<TState>): void {
    this.state = { ...this.state, ...newState };
    this.update();
  }

  update(): void {
    if (!this.mounted || !this.element) return;
    
    const newElement = this.render();
    if (this.element.parentNode) {
      this.element.parentNode.replaceChild(newElement, this.element);
      this.element = newElement;
    }
  }

  updateProps(newProps: Partial<TProps>): void {
    this.props = { ...this.props, ...newProps };
    this.update();
  }
}

// Enhanced h() helper with TypeScript support
export function h(
  tag: string,
  props: ComponentProps = {},
  children: (HTMLElement | string)[] = []
): HTMLElement {
  const el = document.createElement(tag);
  
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'className') {
      el.className = value as string;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key !== 'children' && key !== 'onMount') {
      el.setAttribute(key, String(value));
    }
  });

  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    }
  });

  return el;
}
```

### Example Component Implementation

**File**: `/packages/extension/components/timetable-item.ts`

```typescript
import { Component, h, type ComponentProps } from '@shared/ui/component-base';

interface TimetableItemProps extends ComponentProps {
  item: {
    id: string;
    title: string;
    duration: number;
    startTime?: string;
    endTime?: string;
  };
  onDurationChange: (id: string, duration: number) => void;
  onDelete?: (id: string) => void;
}

interface TimetableItemState {
  isEditing: boolean;
  tempDuration: number;
}

export class TimetableItem extends Component<TimetableItemProps, TimetableItemState> {
  constructor(props: TimetableItemProps) {
    super(props, {
      isEditing: false,
      tempDuration: props.item.duration
    });
  }

  render(): HTMLElement {
    const { item, onDurationChange, onDelete } = this.props;
    const { isEditing, tempDuration } = this.state;

    return h('div', {
      className: 'timetable-item',
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: isEditing ? '#f8f9fa' : 'transparent'
      }
    }, [
      h('div', {
        className: 'item-content',
        style: { flex: '1', marginRight: '12px' }
      }, [
        h('div', {
          className: 'item-title',
          style: { fontWeight: '600', marginBottom: '4px' }
        }, [item.title]),
        h('div', {
          className: 'item-timing',
          style: { fontSize: '0.875rem', color: '#666' }
        }, [
          `${item.startTime || ''} - ${item.endTime || ''} (${item.duration} min)`
        ])
      ]),
      
      isEditing ? this.renderDurationEditor() : this.renderDurationDisplay(),
      
      onDelete && h('button', {
        className: 'delete-btn',
        style: {
          background: 'none',
          border: 'none',
          color: '#dc3545',
          cursor: 'pointer',
          padding: '4px'
        },
        onClick: () => onDelete(item.id)
      }, ['×'])
    ]);
  }

  private renderDurationEditor(): HTMLElement {
    const { onDurationChange } = this.props;
    const { tempDuration } = this.state;

    return h('div', {
      className: 'duration-editor',
      style: { display: 'flex', alignItems: 'center', gap: '8px' }
    }, [
      h('input', {
        type: 'range',
        min: '1',
        max: '60',
        value: String(tempDuration),
        style: { width: '80px' },
        onInput: (e: InputEvent) => {
          const target = e.target as HTMLInputElement;
          this.setState({ tempDuration: parseInt(target.value) });
        }
      }),
      h('input', {
        type: 'number',
        min: '1',
        max: '60',
        value: String(tempDuration),
        style: { width: '50px', textAlign: 'center' },
        onInput: (e: InputEvent) => {
          const target = e.target as HTMLInputElement;
          this.setState({ tempDuration: parseInt(target.value) || 1 });
        }
      }),
      h('button', {
        className: 'save-btn',
        style: {
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer'
        },
        onClick: () => {
          onDurationChange(this.props.item.id, tempDuration);
          this.setState({ isEditing: false });
        }
      }, ['✓']),
      h('button', {
        className: 'cancel-btn',
        style: {
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer'
        },
        onClick: () => {
          this.setState({ 
            isEditing: false, 
            tempDuration: this.props.item.duration 
          });
        }
      }, ['✕'])
    ]);
  }

  private renderDurationDisplay(): HTMLElement {
    return h('button', {
      className: 'edit-duration-btn',
      style: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '0.875rem'
      },
      onClick: () => this.setState({ isEditing: true })
    }, [`${this.props.item.duration}m`]);
  }
}
```

## 2. State Management: StateManager Implementation

### Current State Analysis

**Existing Pattern**: Direct localStorage manipulation scattered throughout codebase
- `/packages/web/src/main-clerk-sdk.js` lines 174-177: Direct localStorage access
- `/packages/extension/sidebar/sidebar.js`: Direct chrome.storage calls mixed with shared storage

### Centralized StateManager Pattern

**File**: `/packages/shared/state/state-manager.ts`

```typescript
export interface StateChangeListener<T = any> {
  (newValue: T, oldValue: T, key: string): void;
}

export interface StateStore {
  [key: string]: any;
}

export interface StateManagerConfig {
  persistKeys?: string[];
  debounceMs?: number;
  enableDevtools?: boolean;
}

export class StateManager {
  private store: StateStore = {};
  private listeners: Map<string, Set<StateChangeListener>> = new Map();
  private persistKeys: Set<string>;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: StateManagerConfig;

  constructor(config: StateManagerConfig = {}) {
    this.config = {
      persistKeys: [],
      debounceMs: 300,
      enableDevtools: false,
      ...config
    };
    
    this.persistKeys = new Set(this.config.persistKeys || []);
    
    // Load persisted state
    this.loadPersistedState();
    
    // Setup devtools
    if (this.config.enableDevtools && typeof window !== 'undefined') {
      (window as any).__GAMMA_STATE__ = this;
    }
  }

  /**
   * Get a value from the state store
   */
  get<T = any>(key: string): T | undefined {
    return this.store[key] as T;
  }

  /**
   * Set a value in the state store
   */
  set<T = any>(key: string, value: T): void {
    const oldValue = this.store[key];
    
    if (oldValue === value) {
      return; // No change
    }

    this.store[key] = value;
    
    // Notify listeners
    this.notifyListeners(key, value, oldValue);
    
    // Persist if needed
    if (this.persistKeys.has(key)) {
      this.debouncedPersist(key, value);
    }
  }

  /**
   * Subscribe to changes for a specific key
   */
  subscribe<T = any>(key: string, listener: StateChangeListener<T>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(listener as StateChangeListener);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener as StateChangeListener);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Update state using a function
   */
  update<T = any>(key: string, updater: (current: T | undefined) => T): void {
    const current = this.get<T>(key);
    const newValue = updater(current);
    this.set(key, newValue);
  }

  /**
   * Remove a key from the state
   */
  remove(key: string): void {
    const oldValue = this.store[key];
    delete this.store[key];
    
    this.notifyListeners(key, undefined, oldValue);
    
    if (this.persistKeys.has(key)) {
      this.removeFromPersistence(key);
    }
  }

  /**
   * Clear all state
   */
  clear(): void {
    const keys = Object.keys(this.store);
    this.store = {};
    
    keys.forEach(key => {
      this.notifyListeners(key, undefined, this.store[key]);
    });
    
    this.clearPersistence();
  }

  /**
   * Get a snapshot of the entire state
   */
  getSnapshot(): StateStore {
    return { ...this.store };
  }

  private notifyListeners<T = any>(key: string, newValue: T, oldValue: T): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(newValue, oldValue, key);
        } catch (error) {
          console.error(`[StateManager] Error in listener for key "${key}":`, error);
        }
      });
    }
  }

  private debouncedPersist(key: string, value: any): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.persistToStorage(key, value);
      this.debounceTimers.delete(key);
    }, this.config.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  private async persistToStorage(key: string, value: any): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Chrome extension environment
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else if (typeof localStorage !== 'undefined') {
        // Web environment
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[StateManager] Failed to persist state for key "${key}":`, error);
    }
  }

  private async loadPersistedState(): Promise<void> {
    if (this.persistKeys.size === 0) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Chrome extension environment
        const keys = Array.from(this.persistKeys);
        const result = await new Promise<Record<string, any>>((resolve, reject) => {
          chrome.storage.local.get(keys, (items) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(items);
            }
          });
        });

        Object.entries(result).forEach(([key, value]) => {
          if (value !== undefined) {
            this.store[key] = value;
          }
        });
      } else if (typeof localStorage !== 'undefined') {
        // Web environment
        this.persistKeys.forEach(key => {
          const stored = localStorage.getItem(key);
          if (stored !== null) {
            try {
              this.store[key] = JSON.parse(stored);
            } catch (error) {
              console.warn(`[StateManager] Failed to parse stored value for key "${key}"`);
            }
          }
        });
      }
    } catch (error) {
      console.error('[StateManager] Failed to load persisted state:', error);
    }
  }

  private async removeFromPersistence(key: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`[StateManager] Failed to remove persisted key "${key}":`, error);
    }
  }

  private clearPersistence(): void {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      this.persistKeys.forEach(key => {
        chrome.storage.local.remove(key);
      });
    } else if (typeof localStorage !== 'undefined') {
      this.persistKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }
}

// Global state manager instances
export const globalState = new StateManager({
  persistKeys: ['user_session', 'app_config', 'device_auth'],
  debounceMs: 500,
  enableDevtools: process.env.NODE_ENV === 'development'
});

export const extensionState = new StateManager({
  persistKeys: ['current_presentation', 'timetable_data', 'sync_status'],
  debounceMs: 300,
  enableDevtools: process.env.NODE_ENV === 'development'
});
```

### StateManager Integration Example

**File**: `/packages/extension/sidebar/state/timetable-state.ts`

```typescript
import { extensionState } from '@shared/state/state-manager';

export interface TimetableItem {
  id: string;
  title: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  content?: any;
}

export interface TimetableData {
  title: string;
  items: TimetableItem[];
  presentationUrl: string;
  totalDuration: number;
  lastModified: string;
}

export class TimetableStateManager {
  private static instance: TimetableStateManager;

  static getInstance(): TimetableStateManager {
    if (!TimetableStateManager.instance) {
      TimetableStateManager.instance = new TimetableStateManager();
    }
    return TimetableStateManager.instance;
  }

  private constructor() {
    // Initialize default state
    this.initializeState();
  }

  getCurrentTimetable(): TimetableData | undefined {
    return extensionState.get<TimetableData>('current_timetable');
  }

  setCurrentTimetable(timetable: TimetableData): void {
    extensionState.set('current_timetable', timetable);
  }

  updateItem(itemId: string, updates: Partial<TimetableItem>): void {
    extensionState.update<TimetableData>('current_timetable', (current) => {
      if (!current) return current;

      const items = current.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );

      return {
        ...current,
        items,
        lastModified: new Date().toISOString()
      };
    });
  }

  removeItem(itemId: string): void {
    extensionState.update<TimetableData>('current_timetable', (current) => {
      if (!current) return current;

      return {
        ...current,
        items: current.items.filter(item => item.id !== itemId),
        lastModified: new Date().toISOString()
      };
    });
  }

  subscribeTo(callback: (timetable: TimetableData | undefined) => void): () => void {
    return extensionState.subscribe('current_timetable', callback);
  }

  private initializeState(): void {
    if (!this.getCurrentTimetable()) {
      // Set default empty state
      extensionState.set('current_timetable', undefined);
    }
  }
}

export const timetableState = TimetableStateManager.getInstance();
```

## 3. API Client Patterns

### Current Analysis

**Existing Pattern**: Manual fetch calls with basic error handling
- `/packages/web/src/main-clerk-sdk.js` lines 272-294: Device pairing API call
- `/packages/shared/storage/index.ts` lines 307-327: Presentation API calls with retry logic

### Standardized API Client

**File**: `/packages/shared/api/api-client.ts`

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      defaultHeaders: {},
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      enableLogging: false,
      ...config
    };
  }

  async request<T = any>(
    endpoint: string,
    requestConfig: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.retries,
      retryDelay = this.config.retryDelay
    } = requestConfig;

    const url = `${this.config.baseUrl}${endpoint}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...headers
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        if (this.config.enableLogging) {
          console.log(`[ApiClient] ${method} ${url} (attempt ${attempt})`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle response
        const responseData = await this.parseResponse<T>(response);

        if (this.config.enableLogging) {
          console.log(`[ApiClient] ${method} ${url} → ${response.status}`, responseData);
        }

        return {
          success: response.ok,
          data: response.ok ? responseData : undefined,
          error: response.ok ? undefined : this.extractErrorMessage(responseData),
          status: response.status
        };

      } catch (error) {
        lastError = error as Error;

        if (this.config.enableLogging) {
          console.warn(`[ApiClient] ${method} ${url} attempt ${attempt} failed:`, error);
        }

        // Don't retry on certain errors
        if (!this.shouldRetry(error as Error, attempt, retries + 1)) {
          break;
        }

        // Wait before retry (with exponential backoff)
        if (attempt <= retries) {
          const delay = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
      status: 0
    };
  }

  async get<T = any>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T = any>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  setAuthToken(token: string): void {
    this.config.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.config.defaultHeaders['Authorization'];
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    } else if (contentType.includes('text/')) {
      return response.text() as any;
    } else {
      return response.blob() as any;
    }
  }

  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    return 'Unknown error occurred';
  }

  private shouldRetry(error: Error, attempt: number, maxAttempts: number): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= maxAttempts) return false;

    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return false;
    }

    // Don't retry on client errors (except rate limiting)
    if (error.message.includes('4') && !error.message.includes('429')) {
      return false;
    }

    // Retry on network errors, server errors, timeouts, and rate limiting
    return true;
  }
}
```

### Presentation API Client

**File**: `/packages/shared/api/presentation-client.ts`

```typescript
import { ApiClient, type ApiResponse } from './api-client';

export interface PresentationData {
  id?: string;
  presentationUrl: string;
  title: string;
  timetableData: {
    title: string;
    items: Array<{
      id: string;
      title: string;
      duration: number;
      startTime?: string;
      endTime?: string;
      content?: any;
    }>;
    lastModified: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PresentationListResponse {
  presentations: Array<{
    id: string;
    presentationUrl: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    sortBy: string;
    sortOrder: string;
    retrievedAt: string;
  };
}

export class PresentationApiClient {
  private apiClient: ApiClient;

  constructor(baseUrl: string, authToken?: string) {
    this.apiClient = new ApiClient({
      baseUrl,
      enableLogging: process.env.NODE_ENV === 'development'
    });

    if (authToken) {
      this.setAuthToken(authToken);
    }
  }

  setAuthToken(token: string): void {
    this.apiClient.setAuthToken(token);
  }

  removeAuthToken(): void {
    this.apiClient.removeAuthToken();
  }

  async savePresentation(data: Omit<PresentationData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<PresentationData>> {
    return this.apiClient.post<PresentationData>('/api/presentations/save', data);
  }

  async getPresentation(presentationUrl: string): Promise<ApiResponse<PresentationData>> {
    const encodedUrl = encodeURIComponent(presentationUrl);
    return this.apiClient.get<PresentationData>(`/api/presentations/get?url=${encodedUrl}`);
  }

  async listPresentations(options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<PresentationListResponse>> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/presentations/list?${queryString}` : '/api/presentations/list';
    
    return this.apiClient.get<PresentationListResponse>(endpoint);
  }

  async deletePresentation(presentationUrl: string): Promise<ApiResponse<void>> {
    const encodedUrl = encodeURIComponent(presentationUrl);
    return this.apiClient.delete(`/api/presentations/delete?url=${encodedUrl}`);
  }

  async ping(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.apiClient.get('/api/protected/ping');
  }
}
```

## 4. Type Safety Patterns

### Current TypeScript Usage

**Analysis**: Mixed usage across codebase
- Strong typing in Netlify functions (`netlify/functions/_utils.ts`)
- Weak typing in extension JavaScript with some TypeScript imports
- Good shared type definitions in `packages/shared/storage/index.ts`

### Enhanced Type Definitions

**File**: `/packages/shared/types/core.ts`

```typescript
// Core domain types
export interface Slide {
  id: string;
  title: string;
  content: string;
  order: number;
  presentationUrl: string;
}

export interface TimetableItem {
  id: string;
  title: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  content?: any;
}

export interface Timetable {
  title: string;
  items: TimetableItem[];
  presentationUrl: string;
  totalDuration: number;
  startTime?: string;
  lastModified: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  clerkId: string;
  deviceId?: string;
  isAuthenticated: boolean;
  sessionToken?: string;
}

export interface DeviceInfo {
  id: string;
  userId?: string;
  isLinked: boolean;
  pairingCode?: string;
  lastSeen: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync?: string;
  hasPendingChanges: boolean;
  syncInProgress: boolean;
  error?: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  environment: 'development' | 'production';
  enableCloudSync: boolean;
  enableDebugMode: boolean;
  version: string;
}

// Event types for type-safe messaging
export interface MessageEvent<T = any> {
  type: string;
  payload: T;
  source: 'content' | 'background' | 'sidebar' | 'popup';
  timestamp: string;
}

export interface SlideUpdateEvent extends MessageEvent<Slide[]> {
  type: 'slide-update';
  payload: Slide[];
}

export interface AuthStateChangeEvent extends MessageEvent<UserSession | null> {
  type: 'auth-state-change';
  payload: UserSession | null;
}

export interface SyncStatusEvent extends MessageEvent<SyncStatus> {
  type: 'sync-status-change';
  payload: SyncStatus;
}
```

### Type-Safe Event System

**File**: `/packages/shared/events/event-bus.ts`

```typescript
import type { MessageEvent } from '@shared/types/core';

export type EventHandler<T = any> = (event: MessageEvent<T>) => void | Promise<void>;

export interface EventBusConfig {
  enableLogging?: boolean;
  maxRetries?: number;
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private config: EventBusConfig;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      enableLogging: false,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Subscribe to events of a specific type
   */
  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      const typeHandlers = this.handlers.get(eventType);
      if (typeHandlers) {
        typeHandlers.delete(handler as EventHandler);
        if (typeHandlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to an event once
   */
  once<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      handler(event);
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   */
  async emit<T = any>(event: MessageEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      if (this.config.enableLogging) {
        console.log(`[EventBus] No handlers for event type: ${event.type}`);
      }
      return;
    }

    if (this.config.enableLogging) {
      console.log(`[EventBus] Emitting event: ${event.type}`, event);
    }

    // Execute all handlers
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in handler for event ${event.type}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Create a typed event emitter
   */
  createEmitter<T = any>(eventType: string, source: MessageEvent['source']) {
    return (payload: T): Promise<void> => {
      return this.emit<T>({
        type: eventType,
        payload,
        source,
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * Remove all handlers for a specific event type
   */
  off(eventType: string): void {
    this.handlers.delete(eventType);
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get event statistics
   */
  getStats(): { eventTypes: string[]; totalHandlers: number } {
    const eventTypes = Array.from(this.handlers.keys());
    const totalHandlers = Array.from(this.handlers.values())
      .reduce((sum, handlerSet) => sum + handlerSet.size, 0);

    return { eventTypes, totalHandlers };
  }
}

// Global event bus instance
export const globalEventBus = new EventBus({
  enableLogging: process.env.NODE_ENV === 'development'
});
```

## 5. Testing Patterns

### Current Testing Status

**Analysis**: 
- Limited testing infrastructure
- Manual QA procedures in place
- Need for automated testing of business logic

### Testing Framework Setup

**File**: `/packages/shared/testing/test-utils.ts`

```typescript
export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export class MockApiClient {
  private responses = new Map<string, MockResponse>();
  private callLog: Array<{ url: string; method: string; body?: any }> = [];

  mockResponse(endpoint: string, response: Partial<MockResponse>): void {
    const fullResponse: MockResponse = {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      ...response
    };
    this.responses.set(endpoint, fullResponse);
  }

  mockJsonResponse(endpoint: string, data: any, status = 200): void {
    this.mockResponse(endpoint, {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data
    });
  }

  mockErrorResponse(endpoint: string, error: string, status = 400): void {
    this.mockResponse(endpoint, {
      ok: false,
      status,
      json: async () => ({ error })
    });
  }

  async request(url: string, options: RequestInit = {}): Promise<MockResponse> {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    
    this.callLog.push({ url, method, body });

    const response = this.responses.get(url);
    if (!response) {
      throw new Error(`No mock response configured for: ${method} ${url}`);
    }

    return response;
  }

  getCallLog(): Array<{ url: string; method: string; body?: any }> {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  reset(): void {
    this.responses.clear();
    this.callLog = [];
  }
}

export class MockStateManager {
  private state = new Map<string, any>();
  private listeners = new Map<string, Set<Function>>();

  get<T>(key: string): T | undefined {
    return this.state.get(key);
  }

  set<T>(key: string, value: T): void {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(value, oldValue, key);
        } catch (error) {
          console.error('Error in mock state listener:', error);
        }
      });
    }
  }

  subscribe(key: string, listener: Function): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(listener);
    
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener);
      }
    };
  }

  clear(): void {
    this.state.clear();
    this.listeners.clear();
  }
}

export function createMockTimetable(overrides: Partial<any> = {}) {
  return {
    title: 'Test Presentation',
    items: [
      {
        id: '1',
        title: 'Slide 1',
        duration: 5,
        startTime: '09:00',
        endTime: '09:05'
      },
      {
        id: '2',
        title: 'Slide 2',
        duration: 10,
        startTime: '09:05',
        endTime: '09:15'
      }
    ],
    presentationUrl: 'https://gamma.app/test-presentation',
    totalDuration: 15,
    lastModified: new Date().toISOString(),
    ...overrides
  };
}

export function createMockUserSession(overrides: Partial<any> = {}) {
  return {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    clerkId: 'clerk123',
    isAuthenticated: true,
    ...overrides
  };
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}
```

### Example Test Cases

**File**: `/packages/shared/testing/timetable.test.ts`

```typescript
import { TimetableStateManager } from '@extension/sidebar/state/timetable-state';
import { MockStateManager, createMockTimetable } from './test-utils';

describe('TimetableStateManager', () => {
  let timetableManager: TimetableStateManager;
  let mockState: MockStateManager;

  beforeEach(() => {
    mockState = new MockStateManager();
    // Inject mock state manager
    (timetableManager as any).state = mockState;
    timetableManager = new TimetableStateManager();
  });

  afterEach(() => {
    mockState.clear();
  });

  test('should initialize with empty state', () => {
    const timetable = timetableManager.getCurrentTimetable();
    expect(timetable).toBeUndefined();
  });

  test('should set and get current timetable', () => {
    const mockTimetable = createMockTimetable();
    
    timetableManager.setCurrentTimetable(mockTimetable);
    const retrieved = timetableManager.getCurrentTimetable();
    
    expect(retrieved).toEqual(mockTimetable);
  });

  test('should update timetable item duration', () => {
    const mockTimetable = createMockTimetable();
    timetableManager.setCurrentTimetable(mockTimetable);
    
    timetableManager.updateItem('1', { duration: 15 });
    
    const updated = timetableManager.getCurrentTimetable();
    expect(updated?.items[0].duration).toBe(15);
    expect(updated?.lastModified).not.toBe(mockTimetable.lastModified);
  });

  test('should remove timetable item', () => {
    const mockTimetable = createMockTimetable();
    timetableManager.setCurrentTimetable(mockTimetable);
    
    timetableManager.removeItem('1');
    
    const updated = timetableManager.getCurrentTimetable();
    expect(updated?.items).toHaveLength(1);
    expect(updated?.items[0].id).toBe('2');
  });

  test('should notify subscribers on changes', async () => {
    const mockTimetable = createMockTimetable();
    const callback = jest.fn();
    
    timetableManager.subscribeTo(callback);
    timetableManager.setCurrentTimetable(mockTimetable);
    
    expect(callback).toHaveBeenCalledWith(mockTimetable);
  });
});
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Component Base System**
   - Implement `Component` class and enhanced `h()` helper
   - Create example components for timetable items
   - Update extension sidebar to use new component patterns

2. **StateManager Implementation**
   - Create centralized state management system
   - Migrate existing localStorage usage to StateManager
   - Implement timetable state management

### Phase 2: API & Types (Week 2)
1. **API Client Framework**
   - Implement standardized ApiClient class
   - Create PresentationApiClient with type safety
   - Migrate existing API calls to new client pattern

2. **Type Safety Enhancement**
   - Define comprehensive core types
   - Implement type-safe event system
   - Add TypeScript strict mode compliance

### Phase 3: Testing & Integration (Week 3)
1. **Testing Infrastructure**
   - Set up testing utilities and mocks
   - Write unit tests for core business logic
   - Create integration tests for API interactions

2. **Error Handling Standardization**
   - Implement centralized error handling
   - Add user-friendly error messages
   - Create error boundary patterns

### Phase 4: Refactoring & Polish (Week 4)
1. **Legacy Code Migration**
   - Migrate existing extension code to new patterns
   - Update web dashboard to use new utilities
   - Clean up deprecated patterns

2. **Documentation & Developer Experience**
   - Create pattern documentation
   - Add TypeScript definitions to existing JS
   - Implement development tools and debugging aids

## Sprint 5+ Considerations

This proposal acknowledges the user's suggestion for a modern Next.js application in future sprints. The patterns established in Sprint 4 will provide a solid migration path:

### React Migration Strategy (Sprint 5+)
- **Component patterns** → React functional components with hooks
- **StateManager** → Redux Toolkit or Zustand integration  
- **API Client** → React Query or SWR integration
- **Type safety** → Full TypeScript React application
- **Testing** → React Testing Library and Jest

### Benefits of Sprint 4 Approach
1. **Immediate Value**: Improves current codebase without major rewrites
2. **Migration Preparation**: Patterns align with modern React practices
3. **Reduced Risk**: Incremental improvements vs. complete framework change
4. **Backward Compatibility**: Maintains existing functionality throughout transition

## Conclusion

This Sprint 4 proposal provides concrete, implementable patterns that:
- Build on proven production-ready foundations
- Address architectural inconsistencies identified in Sprint 3
- Maintain the Tech Lead's decision to continue vanilla JS approach
- Prepare for future React migration while delivering immediate value
- Follow established team practices of discovery-first development

The patterns are designed to be incrementally adopted, allowing the team to maintain velocity while systematically improving code quality and developer experience.