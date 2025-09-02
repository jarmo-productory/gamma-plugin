import { NextResponse } from 'next/server'

export async function GET() {
  const ts = new Date().toISOString()
  const sha = process.env.COMMIT_SHA || null
  return NextResponse.json({ ok: true, ts, sha })
}

