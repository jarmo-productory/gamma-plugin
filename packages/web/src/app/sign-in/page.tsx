import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type SearchParams = { source?: string; code?: string }

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function SignInRedirectPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  const qs = new URLSearchParams()
  if (params.source) qs.set('source', params.source)
  if (params.code) qs.set('code', params.code)

  if (user) {
    redirect(`/dashboard?${qs.toString()}`)
  } else {
    redirect(`/?${qs.toString()}`)
  }
}

