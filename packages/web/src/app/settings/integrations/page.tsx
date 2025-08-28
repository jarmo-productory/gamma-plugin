'use client'

import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Link2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsPage() {
  return (
    <AppLayout>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 flex-1">
          <Link2 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Integrations</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <div className="bg-card border rounded-lg p-8 text-center">
          <Link2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Integrations</h2>
          <p className="text-muted-foreground mb-4">
            Connect Productory Powerups with your favorite tools and platforms.
          </p>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Integration features are coming soon. You'll be able to connect with Google Calendar, Notion, and other productivity tools.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}