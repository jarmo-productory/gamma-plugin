import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/card'
import AuthForm from '@/components/AuthForm'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gamma Timetable</h1>
          <p className="text-muted-foreground mt-2">Transform your presentations into synchronized timetables</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <AuthForm />
          </CardHeader>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Transform your Gamma presentations into organized, time-based schedules with our Chrome extension and cloud sync.</p>
        </div>
      </div>
    </div>
  );
}