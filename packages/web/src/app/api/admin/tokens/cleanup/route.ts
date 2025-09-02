import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service'
import { requireAdminAccess } from '@/utils/internal-guard'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAdminAccess(req)
  if (!guard.ok) return guard.res

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('cleanup_expired_tokens')
    if (error) {
      return NextResponse.json({ error: 'Cleanup failed', details: error.message }, { status: 500 })
    }
    const cleaned = data || 0
    return NextResponse.json({ success: true, cleaned })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Cleanup failed', details: msg }, { status: 500 })
  }
}

