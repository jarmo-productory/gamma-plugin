import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database not configured',
          help: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        },
        { status: 503 }
      )
    }

    // Test database connection
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database connection error:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection failed',
          error: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}