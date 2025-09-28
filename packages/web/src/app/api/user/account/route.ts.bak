import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { confirm } = await request.json().catch(() => ({}))
    if (confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation required: type DELETE' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Invoke RPC which deletes user-owned data under RLS
    const { data, error } = await supabase.rpc('delete_my_account')
    if (error) {
      const e: any = error
      console.error('[Account Delete] RPC error', {
        message: e?.message, code: e?.code, details: e?.details, hint: e?.hint
      })
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    // Return 202 Accepted: client should sign out and redirect
    return NextResponse.json({ success: true }, { status: 202 })
  } catch (err) {
    const e: any = err
    console.error('[Account Delete] Error', { message: e?.message })
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

