import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TimetableDetailClient from './TimetableDetailClient'

interface TimetableDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TimetableDetailPage({ params }: TimetableDetailPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { id } = await params

  return <TimetableDetailClient user={user} presentationId={id} />
}