import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientHomepage from '@/components/ClientHomepage'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <ClientHomepage />;
}