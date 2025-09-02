import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireInternalAccess } from '@/utils/internal-guard'

export async function GET(req: NextRequest) {
  const guard = await requireInternalAccess(req)
  if (!guard.ok) return guard.res
  try {
    const supabase = await createClient()
    
    // Check device_tokens table - what user IDs are stored there (exclude token values for security)
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_id, user_id, user_email, device_name, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(3)
    
    // Check users table - bypass RLS by using service role or checking auth status
    console.log('[DEBUG] Current auth user:', await supabase.auth.getUser())
    
    // Check users table - what users exist (Supabase Auth native)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(5)
    
    // Try to find the specific mapping issue - direct user_id mapping (post-Clerk removal)
    const sampleTokenUserId = deviceTokens?.[0]?.user_id
    let mappingTest = null
    if (sampleTokenUserId) {
      const { data: mappedUser, error: mapError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', sampleTokenUserId)
        .single()
      
      mappingTest = {
        tokenUserId: sampleTokenUserId,
        mappedUser,
        mapError: mapError?.message || null,
        note: 'Post-Clerk removal: Direct user_id mapping'
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        deviceTokensCount: deviceTokens?.length || 0,
        deviceTokensError: tokenError?.message || null,
        usersCount: users?.length || 0,
        usersError: usersError?.message || null,
        mappingTest
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
