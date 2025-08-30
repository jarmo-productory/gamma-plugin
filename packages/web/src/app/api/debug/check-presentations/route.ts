import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check presentations table
    const { data: presentations, error: presError } = await supabase
      .from('presentations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Check device_tokens table  
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('*')
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
        presentations: presentations || [],
        presentationsError: presError?.message || null,
        
        tokensCount: tokens?.length || 0,
        tokens: tokens || [],
        tokensError: tokensError?.message || null,
        
        currentUser: user ? {
          id: user.id,
          email: user.email
        } : null,
        authError: authError?.message || null,
        
        dbUsersCount: dbUsers?.length || 0,
        dbUsers: dbUsers || [],
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