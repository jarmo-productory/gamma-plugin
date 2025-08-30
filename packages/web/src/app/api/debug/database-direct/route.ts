import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use service role client to bypass all RLS policies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Query users table directly without RLS
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    // Query device_tokens table 
    const { data: deviceTokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    
    // Query presentations table
    const { data: presentations, error: presentationsError } = await supabase
      .from('presentations')
      .select('*')
      .limit(5)
    
    // Test the specific mapping from device token to users
    const sampleTokenUserId = deviceTokens?.[0]?.user_id
    let mappingTest = null
    if (sampleTokenUserId) {
      const { data: mappedUser, error: mapError } = await supabase
        .from('users')
        .select('id, clerk_id, email')
        .eq('clerk_id', sampleTokenUserId)
        .maybeSingle()
      
      mappingTest = {
        tokenUserId: sampleTokenUserId,
        mappedUser,
        mapError: mapError?.message || null
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        serviceRoleKeyUsed: serviceRoleKey ? 'Present' : 'Missing',
        users: users || [],
        usersError: usersError?.message || null,
        deviceTokens: deviceTokens || [],
        tokensError: tokensError?.message || null,
        presentations: presentations || [],
        presentationsError: presentationsError?.message || null,
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