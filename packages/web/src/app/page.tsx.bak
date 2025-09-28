import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientHomepage from '@/components/ClientHomepage'

type SearchParams = {
  source?: string;
  code?: string;
}

interface HomePageProps {
  searchParams: Promise<SearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;

  // Redirect authenticated users to dashboard
  if (user) {
    if (params.code && params.source === 'extension') {
      // For pairing requests, redirect to dashboard with parameters
      redirect(`/dashboard?code=${params.code}&source=${params.source}`)
    } else {
      // Regular authenticated users go to dashboard
      redirect('/dashboard')
    }
  }

  // Pass search params to client component to avoid hydration issues
  return <ClientHomepage searchParams={params} />;
}