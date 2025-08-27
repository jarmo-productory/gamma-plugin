import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import DevicePairingDashboard from '@/components/DevicePairingDashboard'

type SearchParams = {
  source?: string;
  code?: string;
}

interface DashboardPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome, {user.email}!
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline">Sign out</Button>
          </form>
        </div>

        {/* Device Pairing for authenticated users */}
        <DevicePairingDashboard />

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Productory Powerups</h2>
          <p className="text-muted-foreground">
            This is your dashboard for all Productory Powerups enhancements. Your Gamma presentation timetables and future productivity tools will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}