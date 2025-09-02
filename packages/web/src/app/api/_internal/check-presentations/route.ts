import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireInternalAccess } from '@/utils/internal-guard'

export async function GET(req: NextRequest) {
  const guard = await requireInternalAccess(req)
  if (!guard.ok) return guard.res
  try {
    const supabase = await createClient()
    
    // Check presentations table
    const { data: presentations, error: presError } = await supabase
      .from('presentations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Check device_tokens table (exclude token values for security)
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('device_id, user_id, user_email, device_name, created_at, expires_at, last_used')
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Check current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Check users table
    const { data: dbUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    return NextResponse.json({
      success: true,
      debug: {
        presentationsCount: presentations?.length || 0,
        presentationsError: presError?.message || null,
        tokensCount: tokens?.length || 0,
        tokensError: tokensError?.message || null,
        currentUser: user ? { id: user.id, email: user.email } : null,
        authError: authError?.message || null,
        dbUsersCount: dbUsers?.length || 0,
        usersError: usersError?.message || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
