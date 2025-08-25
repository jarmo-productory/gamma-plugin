# Gamma UI Component Library

This directory contains the React component library for the Gamma Timetable Extension, built on top of shadcn/ui and the existing Gamma design system.

## Quick Start

### Using React Components

```tsx
import { Button, Card, TimetableItem } from '@ui'

function MyComponent() {
  return (
    <Card>
      <Button variant="primary">Click me</Button>
      <TimetableItem 
        title="My Presentation"
        duration={10}
        onDurationChange={(dur) => console.log(dur)}
      />
    </Card>
  )
}
```

### Using Vanilla JS Bridge

```javascript
import { h, Button as VanillaButton } from '@ui/h-helper'

// Create elements using React-like syntax
const button = h('button', {
  className: 'gamma-button-primary',
  onClick: () => console.log('clicked')
}, ['Click me'])

// Or use component factories
const styledButton = VanillaButton({
  variant: 'primary',
  children: ['Click me'],
  onClick: () => console.log('clicked')
})
```

## Available Components

### Base Components (shadcn/ui)
- `Button` - Comprehensive button component with Gamma variants
- `Card` - Card layout with header, content, footer sections  
- `Input` - Form input with Gamma styling

### Gamma-Specific Components
- `TimetableItem` - Individual slide timetable component
- `SyncControls` - Cloud sync control panel
- `ExportControls` - Export button group
- `PresentationCard` - Dashboard presentation display

### Bridge Components (Vanilla JS)
- `h()` - React-like DOM creation helper
- `Component` - Base class for stateful vanilla JS components
- `createComponent()` - Factory for functional components

## Design System Integration

All components automatically use the Gamma design tokens defined in `globals.css`:

- Colors: Uses CSS variables for consistent theming
- Typography: Gamma font system (system fonts)
- Spacing: 8px grid system
- Animations: Consistent transition timing

## Build Integration

The component library is fully integrated with the Vite build system:

- TypeScript support with strict typing
- Path aliases (`@ui`, `@lib`, `@shared`)
- PostCSS processing for Tailwind CSS
- Compatible with both extension and web builds

## Migration Path

The library supports gradual migration from vanilla JS to React:

1. Start with the `h()` helper to improve existing vanilla JS
2. Use component factories for reusable patterns
3. Migrate to full React components when ready
4. All patterns use the same design tokens and styling

## Next Steps

- Install additional shadcn/ui components with: `npx shadcn@latest add [component]`
- Extend Gamma-specific components as needed
- Gradually migrate existing vanilla JS components to React patterns