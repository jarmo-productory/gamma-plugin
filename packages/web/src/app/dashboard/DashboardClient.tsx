'use client'

import { Button } from '@/components/ui/button'
import DevicePairingDashboard from '@/components/DevicePairingDashboard'
import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface DashboardClientProps {
  user: {
    email?: string
  }
}

export default function DashboardClient({ user }: DashboardClientProps) {
  return (
    <AppLayout user={user}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h2 className="text-2xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground">
            Hello, {user.email}
          </p>
        </div>

        {/* Device Pairing for authenticated users */}
        <DevicePairingDashboard />

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Your Productory Powerups</h3>
          <p className="text-muted-foreground">
            This is your dashboard for all Productory Powerups enhancements. Your Gamma presentation timetables and future productivity tools will appear here.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}