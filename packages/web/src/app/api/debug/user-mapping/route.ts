import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check device_tokens table - what user IDs are stored there
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    
    // Check users table - bypass RLS by using service role or checking auth status
    console.log('[DEBUG] Current auth user:', await supabase.auth.getUser())
    
    // Try with rpc call that bypasses RLS
    const { data: userCount, error: countError } = await supabase
      .rpc('count_users_debug')
      .single()
    
    // Check users table - what clerk_ids exist
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    // Try to find the specific mapping issue
    const sampleTokenUserId = deviceTokens?.[0]?.user_id
    let mappingTest = null
    if (sampleTokenUserId) {
      const { data: mappedUser, error: mapError } = await supabase
        .from('users')
        .select('id, clerk_id')
        .eq('clerk_id', sampleTokenUserId)
        .single()
      
      mappingTest = {
        tokenUserId: sampleTokenUserId,
        mappedUser,
        mapError: mapError?.message || null
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        deviceTokens: deviceTokens || [],
        deviceTokensError: tokenError?.message || null,
        users: users || [],
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