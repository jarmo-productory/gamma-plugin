import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireInternalAccess } from '@/utils/internal-guard'

export async function GET(req: NextRequest) {
  const guard = await requireInternalAccess(req)
  if (!guard.ok) return guard.res
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database not configured',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined',
            keyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined'
          }
        },
        { status: 503 }
      )
    }

    // Test with proper Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Just test the auth endpoint - no database query needed
    const { error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Supabase client connection failed',
          error: error.message,
          url: supabaseUrl
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Supabase connection successful',
        timestamp: new Date().toISOString(),
        url: supabaseUrl
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
