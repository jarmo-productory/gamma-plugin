# Tailwind CSS Migration Guide

## Component Mapping Strategy: h() to Tailwind Classes

This guide shows how to migrate from the current `h()` helper function with inline styles to Tailwind CSS classes while preserving the exact visual appearance and behavior.

### Migration Philosophy

1. **Preserve Visual Fidelity**: Every component should look identical after migration
2. **Maintain UX Patterns**: All interactions, hover states, and animations preserved
3. **Improve Maintainability**: Replace inline styles with semantic utility classes
4. **Enable Theme Switching**: Support light/dark modes out of the box
5. **shadcn/ui Compatibility**: Ready for component library integration

---

## Core Component Migrations

### 1. Button Components

#### Current h() Implementation:
```javascript
// Primary Button
h('button', {
  style: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  onmouseover: (e) => e.target.style.background = '#4338ca',
  onmouseout: (e) => e.target.style.background = '#4f46e5'
}, 'Sign In')
```

#### Tailwind Migration:
```javascript
// Using custom utility class
h('button', {
  className: 'btn-primary'
}, 'Sign In')

// Or with utility classes
h('button', {
  className: 'bg-brand-primary hover:bg-brand-primary-hover text-white border-none px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150'
}, 'Sign In')

// Or with shadcn/ui component (future)
Button({ variant: 'default', size: 'default' }, 'Sign In')
```

#### Secondary Button:
```javascript
// Current
h('button', {
  style: {
    background: '#e0e7ff',
    color: '#4f46e5',
    border: '1px solid transparent',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  }
}, 'Export')

// Tailwind
h('button', {
  className: 'btn-secondary'
}, 'Export')

// Or utility classes
h('button', {
  className: 'bg-brand-primary-light text-brand-primary border border-transparent px-3 py-1.5 rounded-md text-xs font-medium hover:bg-brand-primary-lighter transition-colors'
}, 'Export')
```

### 2. Card Components

#### Slide Card:
```javascript
// Current
h('div', {
  style: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    padding: '12px 15px 20px 15px',
    transition: 'box-shadow 0.2s'
  }
}, content)

// Tailwind
h('div', {
  className: 'slide-card'
}, content)

// Or utility classes
h('div', {
  className: 'bg-white rounded-lg mb-3 shadow-xs p-4 pb-5 transition-shadow duration-200 hover:shadow-md'
}, content)
```

#### Dashboard Card:
```javascript
// Current
h('div', {
  style: {
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '64px 32px',
    textAlign: 'center'
  }
}, content)

// Tailwind
h('div', {
  className: 'gamma-card p-16 text-center'
}, content)

// Or utility classes
h('div', {
  className: 'bg-card text-card-foreground rounded-lg border shadow-sm p-16 text-center'
}, content)
```

### 3. Form Elements

#### Time Input Container:
```javascript
// Current
h('div', {
  style: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    padding: '0 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'transparent'
  }
}, segments)

// Tailwind
h('div', {
  className: 'time-input-container'
}, segments)

// Or utility classes
h('div', {
  className: 'flex items-center h-8 px-2 border border-gray-300 rounded-md bg-transparent'
}, segments)
```

#### Range Slider:
```javascript
// Current
h('input', {
  type: 'range',
  style: {
    appearance: 'none',
    width: '100%',
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    outline: 'none',
    opacity: '0.7',
    transition: 'opacity 0.15s ease-in-out'
  }
})

// Tailwind
h('input', {
  type: 'range',
  className: 'range-slider'
})

// Or utility classes
h('input', {
  type: 'range',
  className: 'w-full h-1.5 bg-gray-200 rounded-sm outline-none opacity-70 transition-opacity duration-150 appearance-none'
})
```

### 4. Layout Components

#### Sidebar Header:
```javascript
// Current
h('div', {
  style: {
    position: 'sticky',
    top: '0',
    backgroundColor: 'white',
    zIndex: '1000',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
  }
}, content)

// Tailwind
h('div', {
  className: 'sidebar-header'
}, content)

// Or utility classes
h('div', {
  className: 'sticky top-0 bg-white z-[1000] p-4 px-6 border-b shadow-sm'
}, content)
```

#### Main Container:
```javascript
// Current
h('main', {
  style: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '48px 24px'
  }
}, content)

// Tailwind
h('main', {
  className: 'max-w-dashboard mx-auto py-12 px-6'
}, content)
```

### 5. Sync Controls

#### Sync Button Base:
```javascript
// Current
h('button', {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '32px',
    padding: '0 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    flex: '1',
    minWidth: '120px',
    justifyContent: 'center'
  }
}, content)

// Tailwind
h('button', {
  className: 'sync-btn'
}, content)

// Or utility classes
h('button', {
  className: 'sync-btn-base'
}, content)
```

#### Save to Cloud Button:
```javascript
// Current (additional styles on top of base)
const saveBtn = h('button', { 
  className: 'sync-btn sync-btn-save'
}, [
  h('span', { className: 'sync-btn-icon' }, '☁️'),
  h('span', { className: 'sync-btn-text' }, 'Save')
])

// With hover states in CSS
```

---

## Migration Patterns

### 1. Progressive Migration Strategy

**Phase 1: Add Tailwind alongside existing styles**
```javascript
// Transition period - both systems work
h('button', {
  style: { /* existing styles */ },
  className: 'btn-primary' // New Tailwind class
})
```

**Phase 2: Replace inline styles with Tailwind**
```javascript
// Remove inline styles, keep Tailwind
h('button', {
  className: 'btn-primary'
})
```

**Phase 3: Optimize and standardize**
```javascript
// Use semantic class names
h('button', {
  className: 'gamma-button-primary'
})
```

### 2. Component Factory Pattern

Create a bridge between h() and modern components:

```javascript
// Component factory for consistent styling
const Button = {
  primary: (props, children) => h('button', {
    className: 'btn-primary',
    ...props
  }, children),
  
  secondary: (props, children) => h('button', {
    className: 'btn-secondary',
    ...props
  }, children),
  
  export: (props, children) => h('button', {
    className: 'btn-export',
    ...props
  }, children)
}

// Usage
Button.primary({ onclick: handleClick }, 'Sign In')
```

### 3. Event Handler Migration

**Current Pattern:**
```javascript
h('button', {
  onmouseover: (e) => e.target.style.background = '#4338ca',
  onmouseout: (e) => e.target.style.background = '#4f46e5'
})
```

**Tailwind Pattern:**
```javascript
h('button', {
  className: 'bg-brand-primary hover:bg-brand-primary-hover transition-colors'
})
```

### 4. Responsive Design Migration

**Current Pattern:**
```javascript
// Media queries in CSS or conditional styles
```

**Tailwind Pattern:**
```javascript
h('div', {
  className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
})

// Or with custom responsive utilities
h('div', {
  className: 'sync-controls' // Responsive flex-col on mobile
})
```

---

## Theme Switching Implementation

### 1. Dark Mode Toggle

```javascript
// Theme toggle component
const ThemeToggle = () => {
  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', 
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    )
  }
  
  return h('button', {
    className: 'p-2 rounded-md border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors',
    onclick: toggleTheme
  }, [
    h('span', { className: 'dark:hidden' }, '🌙'),
    h('span', { className: 'hidden dark:inline' }, '☀️')
  ])
}
```

### 2. Theme Initialization

```javascript
// Theme initialization script
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
}

// Run on page load
initTheme()
```

---

## shadcn/ui Integration Strategy

### 1. Component Library Setup

```bash
# Install shadcn/ui (when ready to migrate)
npx shadcn-ui@latest init

# Add specific components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
```

### 2. Component Replacement Timeline

**Immediate (Sprint 4):**
- Use Tailwind utilities with existing h() pattern
- Implement theme switching with CSS custom properties
- Add semantic Tailwind classes for all components

**Phase 2 (Future Sprint):**
- Introduce shadcn/ui components gradually
- Replace h() with React components in web dashboard
- Maintain h() pattern in extension for simplicity

**Phase 3 (Long-term):**
- Full shadcn/ui component library
- TypeScript component definitions
- Advanced theming and customization

### 3. Compatibility Layer

```javascript
// Bridge between h() and shadcn/ui
const GammaComponents = {
  Button: ({ variant = 'primary', ...props }, children) => {
    const className = {
      primary: 'gamma-button-primary',
      secondary: 'gamma-button-secondary',
      outline: 'gamma-button-outline'
    }[variant]
    
    return h('button', { 
      className: `${className} ${props.className || ''}`,
      ...props 
    }, children)
  }
}
```

---

## Migration Checklist

### ✅ Completed
- [x] Extract design tokens from existing CSS
- [x] Create comprehensive Tailwind config
- [x] Map to shadcn/ui color system
- [x] CSS custom properties for theme switching
- [x] Component utility classes

### 🔄 Ready for Implementation
- [ ] Add Tailwind CSS to build pipeline
- [ ] Migrate one component as proof of concept
- [ ] Test theme switching functionality
- [ ] Update development workflow

### 📋 Future Phases
- [ ] Complete component migration
- [ ] shadcn/ui integration
- [ ] TypeScript component definitions
- [ ] Storybook component documentation

---

## File Structure After Migration

```
packages/
├── web/
│   ├── src/
│   │   ├── globals.css          # Theme variables and base styles
│   │   ├── components/          # React components (future)
│   │   └── lib/
│   │       └── utils.ts         # cn() utility and theme helpers
├── extension/
│   ├── sidebar/
│   │   ├── sidebar.html         # Updated with Tailwind classes
│   │   ├── sidebar.js           # h() with Tailwind classes
│   │   └── sidebar.css          # Minimal custom styles only
├── shared/
│   ├── components/              # Shared component utilities
│   └── styles/                  # Shared Tailwind utilities
tailwind.config.js               # Root Tailwind configuration
```

This migration strategy preserves all existing functionality while modernizing the styling system and enabling advanced features like theme switching and component library integration.