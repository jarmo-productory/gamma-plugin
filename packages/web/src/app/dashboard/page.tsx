import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
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
            <h1 className="text-3xl font-bold">Welcome to Gamma Timetable</h1>
            <p className="text-muted-foreground mt-2">
              Hello {user.email}! Your presentations and timetables will appear here.
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline">Sign out</Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🎯 Presentations</CardTitle>
              <CardDescription>Manage your Gamma presentations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                No presentations found. Connect the Chrome extension to start importing your presentations.
              </p>
              <Button variant="outline" className="w-full">
                Install Extension
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⏰ Timetables</CardTitle>
              <CardDescription>View your generated timetables</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create timetables from your presentations to better organize your content.
              </p>
              <Button variant="outline" className="w-full">
                Create Timetable
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚙️ Settings</CardTitle>
              <CardDescription>Configure your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sync settings, notifications, and extension preferences.
              </p>
              <Button variant="outline" className="w-full">
                Open Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>🚀 Getting Started</CardTitle>
              <CardDescription>Follow these steps to set up your timetables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Install the Chrome Extension</p>
                  <p className="text-sm text-muted-foreground">
                    Get our Chrome extension to start importing presentations from Gamma
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Import Your First Presentation</p>
                  <p className="text-sm text-muted-foreground">
                    Open a Gamma presentation and use the extension to import it
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Generate Your Timetable</p>
                  <p className="text-sm text-muted-foreground">
                    Transform your presentation into a synchronized timetable
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}