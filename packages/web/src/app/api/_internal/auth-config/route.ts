import { NextRequest, NextResponse } from 'next/server'
import { requireInternalAccess } from '@/utils/internal-guard'

export async function GET(req: NextRequest) {
  const guard = await requireInternalAccess(req)
  if (!guard.ok) return guard.res
  const authConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    expectedCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    message: 'Authentication configuration loaded',
    config: authConfig
  })
}
