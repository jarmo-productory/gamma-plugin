# Sprint 4: Technical Patterns & Architecture Decisions

**Created:** 2025-08-16  
**Status:** PROPOSED  
**Author:** Tech Lead Agent  

## Executive Summary

Sprint 4 will establish consistent technical patterns across the Gamma Timetable Extension codebase, addressing discovered architectural inconsistencies and providing clear standards for future development. These decisions are based on analysis of the current production system and aim to reduce technical debt while maintaining rapid delivery capability.

## 🎯 Core Architectural Decisions

### 1. API Architecture Decision: **Netlify Functions (Primary)**

**Decision:** Continue with Netlify Functions as the primary API layer. Remove any Next.js API route patterns.

**Rationale:**
- ✅ **Already operational** - 11 Netlify functions deployed and working in production
- ✅ **Consistent deployment** - Single deployment target with Netlify CI/CD
- ✅ **Better isolation** - Each function is independently deployable and scalable
- ✅ **TypeScript support** - Full type safety with `@netlify/functions` types
- ✅ **Environment consistency** - Single environment variable management through Netlify

**Implementation Standards:**
```typescript
// Standard Netlify Function Pattern
import type { Handler } from '@netlify/functions';
import { json, log, rateLimit } from './_utils';
import { APIError, APIResponse } from './_types';

export const handler: Handler = async (event, context) => {
  try {
    // 1. Method validation
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'method_not_allowed' });
    }

    // 2. Rate limiting
    const rl = rateLimit('endpoint-name', getClientIp(event), 10, 60_000);
    if (!rl.allowed) return json(429, { error: 'rate_limited' });

    // 3. Authentication
    const auth = await authenticate(event);
    if (!auth.valid) return json(401, { error: auth.error });

    // 4. Input validation
    const input = await validateInput(event.body);
    if (!input.valid) return json(400, { error: input.error });

    // 5. Business logic
    const result = await processRequest(input.data, auth.user);

    // 6. Structured logging
    log(event, 'endpoint_success', { userId: auth.user.id });

    // 7. Consistent response
    return json(200, { success: true, data: result });

  } catch (error) {
    return handleError(error, event);
  }
};
```

**Migration Actions:**
- Remove any Next.js API route files if discovered
- Consolidate all API logic into `netlify/functions/`
- Create shared utilities in `netlify/functions/_*.ts` (underscore prefix for non-endpoints)

---

### 2. Framework Patterns: **Static HTML + Vanilla JS (Current) → React Migration (Future)**

**Decision:** Maintain current static HTML + vanilla JS approach for Sprint 4, plan React migration for Sprint 5+.

**Rationale:**
- ✅ **Working in production** - Current approach is functional and deployed
- ✅ **No SSR/SSG needed** - Application is client-side only with API backend
- ✅ **Faster iteration** - No build complexity for web dashboard updates
- ✅ **Future-ready** - Vite already configured for React when needed

**Current Pattern (Sprint 4):**
```javascript
// Standardized Component Pattern
class DashboardComponent {
  constructor(container, state = {}) {
    this.container = container;
    this.state = state;
    this.listeners = new Map();
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.appendChild(this.buildDOM());
  }

  buildDOM() {
    return h('div', { class: 'component' }, [
      // Component structure
    ]);
  }

  destroy() {
    this.listeners.forEach((listener, element) => {
      element.removeEventListener(...listener);
    });
  }
}
```

**Future Migration Path (Sprint 5+):**
- Introduce React incrementally starting with isolated components
- Use Vite's React preset for build configuration
- Maintain backward compatibility during transition
- Target completion by Sprint 7

---

### 3. Data Flow Patterns: **Event-Driven State Management**

**Decision:** Implement centralized state management with event-driven updates.

**Pattern Architecture:**
```typescript
// Shared State Manager
class StateManager extends EventTarget {
  private state: AppState = {};
  private subscribers = new Map<string, Set<Function>>();

  // Atomic state updates
  updateState(path: string, value: any) {
    const oldValue = this.getState(path);
    this.setState(path, value);
    
    this.dispatchEvent(new CustomEvent('statechange', {
      detail: { path, oldValue, newValue: value }
    }));
  }

  // Subscribe to specific state paths
  subscribe(path: string, callback: Function) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    this.subscribers.get(path)!.add(callback);
    
    return () => this.subscribers.get(path)?.delete(callback);
  }
}

// API Communication Pattern
class APIClient {
  constructor(private baseURL: string, private stateManager: StateManager) {}

  async request<T>(endpoint: string, options: RequestOptions): Promise<APIResponse<T>> {
    try {
      // Optimistic updates
      if (options.optimistic) {
        this.stateManager.updateState(options.optimistic.path, options.optimistic.value);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update
        if (options.optimistic) {
          this.stateManager.updateState(options.optimistic.path, options.optimistic.oldValue);
        }
        throw new APIError(data.error, response.status);
      }

      // Update state with server response
      if (options.updateState) {
        this.stateManager.updateState(options.updateState.path, data);
      }

      return { success: true, data };

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
}
```

**Benefits:**
- Single source of truth for application state
- Predictable data flow
- Easy debugging and testing
- Optimistic UI updates with rollback
- Decoupled components

---

### 4. Error Handling Patterns: **Layered Error Management**

**Decision:** Implement three-layer error handling with consistent error types.

**Error Hierarchy:**
```typescript
// Base Error Types
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, field: string, value?: any) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message: string, reason: string) {
    super(message, 'AUTH_ERROR', 401, { reason });
    this.name = 'AuthenticationError';
  }
}

class NetworkError extends AppError {
  constructor(message: string, endpoint: string, originalError?: any) {
    super(message, 'NETWORK_ERROR', 0, { endpoint, originalError });
    this.name = 'NetworkError';
  }
}

// Global Error Handler
class ErrorHandler {
  private handlers = new Map<string, ErrorHandlerFunction>();

  register(errorType: string, handler: ErrorHandlerFunction) {
    this.handlers.set(errorType, handler);
  }

  handle(error: Error, context?: any): ErrorResponse {
    // 1. Log error with context
    console.error('[Error]', error.name, error.message, context);

    // 2. Get specific handler or use default
    const handler = this.handlers.get(error.name) || this.defaultHandler;

    // 3. Execute handler
    const response = handler(error, context);

    // 4. Emit error event for UI updates
    window.dispatchEvent(new CustomEvent('app:error', { 
      detail: { error, response, context } 
    }));

    return response;
  }

  private defaultHandler(error: Error): ErrorResponse {
    return {
      display: 'An unexpected error occurred',
      action: 'retry',
      technical: error.message
    };
  }
}

// Usage in API layer
try {
  const result = await api.savePresentation(data);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error specifically
    showFieldError(error.details.field, error.message);
  } else {
    // Use global handler for other errors
    errorHandler.handle(error, { operation: 'save_presentation' });
  }
}
```

**Error Response Standards:**
```typescript
// API Error Response
{
  error: string;          // Machine-readable error code
  message?: string;       // Human-readable message
  details?: any;          // Additional context
  retryAfter?: number;    // For rate limiting
  validationErrors?: {    // For validation failures
    field: string;
    message: string;
  }[];
}

// Client Error Display
{
  display: string;        // User-friendly message
  action: 'retry' | 'reload' | 'contact' | 'none';
  technical?: string;     // Developer message (console only)
}
```

---

### 5. Module Organization: **Domain-Driven Package Structure**

**Decision:** Organize code by domain/feature rather than technical layers.

**New Structure:**
```
packages/
├── extension/              # Chrome Extension Domain
│   ├── core/              # Core extension logic
│   │   ├── background/     # Service worker
│   │   ├── content/        # Content scripts
│   │   └── messaging/      # Message passing
│   ├── features/          # Feature modules
│   │   ├── timetable/     # Timetable generation
│   │   ├── export/        # Export functionality
│   │   └── sync/          # Cloud sync
│   └── ui/                # UI components
│       ├── popup/         # Extension popup
│       └── sidebar/       # Sidebar panel
│
├── web/                   # Web Dashboard Domain
│   ├── core/              # Core web logic
│   │   ├── auth/          # Authentication
│   │   ├── api/           # API client
│   │   └── state/         # State management
│   ├── features/          # Feature modules
│   │   ├── dashboard/     # Main dashboard
│   │   ├── presentations/ # Presentation management
│   │   └── settings/      # User settings
│   └── ui/                # UI components
│       └── components/    # Reusable components
│
├── shared/                # Cross-Domain Shared Code
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utility functions
│   ├── constants/        # Shared constants
│   └── validation/       # Validation schemas
│
netlify/
└── functions/            # API Domain
    ├── _core/           # Core API utilities
    │   ├── auth.ts      # Authentication logic
    │   ├── database.ts  # Database utilities
    │   ├── errors.ts    # Error handling
    │   └── validation.ts # Input validation
    ├── auth/            # Auth endpoints
    ├── devices/         # Device endpoints
    └── presentations/   # Presentation endpoints
```

**Migration Strategy:**
1. **Phase 1:** Create new structure alongside existing code
2. **Phase 2:** Gradually move files to new locations with git mv
3. **Phase 3:** Update imports and build configurations
4. **Phase 4:** Remove old structure

**Benefits:**
- Clear domain boundaries
- Easier to find related code
- Better encapsulation
- Supports future microservices split

---

## 📋 Implementation Checklist

### Immediate Actions (Sprint 4)

- [ ] Create error handling utilities in `netlify/functions/_errors.ts`
- [ ] Standardize all API responses to consistent format
- [ ] Implement StateManager class for web dashboard
- [ ] Create APIClient with optimistic updates
- [ ] Document patterns in `/documents/technical-patterns.md`

### Migration Tasks (Sprint 4-5)

- [ ] Refactor existing Netlify functions to standard pattern
- [ ] Extract common validation logic to shared utilities
- [ ] Implement domain-driven folder structure
- [ ] Create error boundary components for UI
- [ ] Add structured logging with correlation IDs

### Future Considerations (Sprint 5+)

- [ ] Evaluate React migration timeline
- [ ] Consider TypeScript strict mode enforcement
- [ ] Implement request/response interceptors
- [ ] Add telemetry and monitoring
- [ ] Create developer tooling for pattern enforcement

---

## 🎨 Code Style Standards

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Naming Conventions
- **Files:** `kebab-case.ts` for modules, `PascalCase.ts` for classes
- **Functions:** `camelCase` for functions, `UPPER_SNAKE` for constants
- **Types:** `PascalCase` for types/interfaces, `I` prefix avoided
- **Private:** `_` prefix for private methods/properties

### Documentation Standards
```typescript
/**
 * Saves a presentation to the database
 * @param data - The presentation data to save
 * @param userId - The authenticated user's ID
 * @returns Promise<SaveResult> - The saved presentation with metadata
 * @throws {ValidationError} When input data is invalid
 * @throws {AuthenticationError} When user is not authenticated
 */
async function savePresentation(
  data: PresentationData, 
  userId: string
): Promise<SaveResult> {
  // Implementation
}
```

---

## 🚀 Benefits & Impact

### Immediate Benefits
- **Consistency:** Predictable patterns across codebase
- **Maintainability:** Easier onboarding and debugging
- **Quality:** Reduced bugs through standardization
- **Velocity:** Faster development with clear patterns

### Long-term Impact
- **Scalability:** Architecture supports growth
- **Flexibility:** Easy to adapt and extend
- **Team Efficiency:** Clear guidelines reduce decision fatigue
- **Technical Debt:** Proactive management prevents accumulation

---

## 📊 Success Metrics

- **Code Review Time:** 50% reduction in review cycles
- **Bug Reports:** 30% reduction in pattern-related bugs
- **Developer Velocity:** 25% increase in feature delivery
- **Onboarding Time:** New developers productive in 2 days vs 5 days

---

## 🔄 Review & Approval

**Approval Required From:**
- [ ] Tech Lead (Architecture alignment)
- [ ] Full-Stack Engineer (Implementation feasibility)
- [ ] QA Engineer (Testing implications)
- [ ] DevOps Engineer (Deployment considerations)

**Review Criteria:**
- Does this solve our current inconsistencies?
- Are patterns clear and enforceable?
- Is migration path realistic?
- Do benefits justify the effort?

---

## 📝 Decision Log

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2025-08-16 | Netlify Functions over Next.js API | Already operational, simpler deployment | Removes dual paradigm |
| 2025-08-16 | Defer React migration to Sprint 5+ | Current approach working, focus on patterns | Reduces Sprint 4 scope |
| 2025-08-16 | Event-driven state management | Decouples components, predictable flow | Better testing/debugging |
| 2025-08-16 | Domain-driven organization | Clearer boundaries, easier navigation | Future microservices ready |

---

**Next Steps:**
1. Team review and feedback on this proposal
2. Adjust based on team input
3. Create implementation tickets
4. Begin Sprint 4 with discovery phase
5. Execute pattern standardization

This proposal provides concrete, actionable decisions that will guide Sprint 4's refactoring effort while maintaining production stability.