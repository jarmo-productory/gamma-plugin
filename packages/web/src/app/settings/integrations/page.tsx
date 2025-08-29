import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import IntegrationsClient from './IntegrationsClient'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userData = {
    email: user.email,
    name: user.user_metadata?.full_name || user.email?.split('@')[0],
  }

  return <IntegrationsClient user={userData} />
}