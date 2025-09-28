import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type GuardResult = { ok: true } | { ok: false; res: NextResponse }

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 })
}

function extractBearer(headerValue: string | null): string | null {
  if (!headerValue) return null
  const value = headerValue.trim()
  const prefix = 'Bearer '
  if (value.startsWith(prefix)) return value.substring(prefix.length)
  return null
}

export async function requireInternalAccess(req: NextRequest): Promise<GuardResult> {
  const enabled = process.env.ENABLE_INTERNAL_APIS === 'true'
  if (!enabled) return { ok: false, res: notFound() }

  const tokenHeader = req.headers.get('x-internal-auth') || req.headers.get('X-Internal-Auth')
  const token = extractBearer(tokenHeader)
  const expected = process.env.INTERNAL_API_TOKEN || ''

  if (!token || !expected || token !== expected) {
    return { ok: false, res: notFound() }
  }

  return { ok: true }
}

export async function requireAdminAccess(req: NextRequest): Promise<GuardResult> {
  // First ensure internal access gate passes
  const internal = await requireInternalAccess(req)
  if (!('ok' in internal) || !internal.ok) return internal

  // Optional admin email allowlist
  const allowlist = (process.env.INTERNAL_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allowlist.length === 0) return { ok: true }

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || !user.email) return { ok: false, res: notFound() }
    if (!allowlist.includes(user.email)) return { ok: false, res: notFound() }
    return { ok: true }
  } catch {
    return { ok: false, res: notFound() }
  }
}

