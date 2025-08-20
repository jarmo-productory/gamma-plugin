// Export React UI components with their original names
export { Button, type ButtonProps } from "./button"
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card" 
export { Input, type InputProps } from "./input"
export { Badge, type BadgeProps } from "./badge"

// Export Gamma-specific components
export * from "./gamma-components"

// Export the h() helper for vanilla JS bridge (with renamed exports to avoid conflicts)
export { 
  h, 
  Component, 
  createComponent, 
  tw,
  Button as VanillaButton,
  Card as VanillaCard,
  Input as VanillaInput,
  type ComponentProps,
  type EventHandlers
} from "./h-helper"