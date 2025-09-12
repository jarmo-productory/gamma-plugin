import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const ts = new Date().toISOString()
  
  // Try to read commit SHA from build-time file first, then env vars
  let sha = null
  try {
    const commitShaPath = join(process.cwd(), 'COMMIT_SHA')
    sha = readFileSync(commitShaPath, 'utf-8').trim()
  } catch {
    // Fallback to environment variables  
    sha = process.env.COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null
  }
  
  return NextResponse.json({ ok: true, ts, sha })
}

