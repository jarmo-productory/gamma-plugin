import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get('code')

  // Derive a canonical origin that is stable on Netlify:
  // 1) Prefer explicit app URL from env (set to primary domain in prod)
  // 2) Fall back to x-forwarded headers from CDN/edge
  // 3) Last resort: origin parsed from request.url
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const xfHost = request.headers.get('x-forwarded-host')
  const xfProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedOrigin = xfHost ? `${xfProto}://${xfHost}` : undefined
  const origin = configuredAppUrl || forwardedOrigin || url.origin

  // Only allow relative internal redirects to avoid open-redirects
  const rawNext = searchParams.get('next') ?? '/'
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
