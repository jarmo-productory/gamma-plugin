import { ReactNode } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

interface StickyHeaderProps {
  children: ReactNode
  className?: string
}

/**
 * Unified sticky header component for consistent header behavior across all screens
 * 
 * Features:
 * - Sticky positioning with proper z-index
 * - Consistent height (64px) and styling
 * - Built-in SidebarTrigger
 * - Background to prevent content bleeding
 * 
 * Usage:
 * ```tsx
 * <StickyHeader>
 *   <div className="flex items-center gap-2 flex-1">
 *     <Icon className="h-5 w-5" />
 *     <h1 className="text-lg font-semibold">Page Title</h1>
 *   </div>
 *   // Additional header content goes here
 * </StickyHeader>
 * ```
 * 
 * Replaces:
 * ```tsx
 * <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
 *   <SidebarTrigger className="-ml-1" />
 *   // content goes here
 * </header>
 * ```
 */
export function StickyHeader({ children, className }: StickyHeaderProps) {
  return (
    <header 
      className={cn(
        "sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background",
        className
      )}
    >
      <SidebarTrigger className="-ml-1" />
      {children}
    </header>
  )
}