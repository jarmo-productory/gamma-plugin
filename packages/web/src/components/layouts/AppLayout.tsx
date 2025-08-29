'use client'

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "@/components/layouts/AppSidebar"

interface AppLayoutProps {
  children: React.ReactNode
  user?: {
    email?: string
    name?: string
  }
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}