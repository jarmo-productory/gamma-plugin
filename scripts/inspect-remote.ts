#!/usr/bin/env tsx
/**
 * Remote Database Inspection Script (Bypasses RLS)
 * 
 * Uses service role key to bypass RLS for inspection purposes.
 * Safe for local development and admin tasks.
 * 
 * Usage:
 *   node scripts/inspect-remote.ts users
 *   node scripts/inspect-remote.ts presentations
 *   node scripts/inspect-remote.ts query "SELECT * FROM users LIMIT 10;"
 *   node scripts/inspect-remote.ts inspect table users
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dknqqcnnbcqujeffbmmb.supabase.co'

function getServiceRoleKey(): string {
  // Try environment variable first (highest priority)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY
  }
  
  // Try root .env.local (preferred for root-level scripts)
  try {
    const rootEnvPath = join(process.cwd(), '.env.local')
    const rootEnv = readFileSync(rootEnvPath, 'utf-8')
    const rootMatch = rootEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    if (rootMatch) {
      return rootMatch[1].trim().replace(/^["']|["']$/g, '') // Remove quotes if present
    }
  } catch (e) {
    // Root .env.local doesn't exist, try web package
  }
  
  // Fallback to packages/web/.env.local (for web-specific scripts)
  try {
    const webEnvPath = join(process.cwd(), 'packages/web/.env.local')
    const webEnv = readFileSync(webEnvPath, 'utf-8')
    const webMatch = webEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    if (webMatch) {
      return webMatch[1].trim().replace(/^["']|["']$/g, '') // Remove quotes if present
    }
  } catch (e) {
    // Web .env.local doesn't exist either
  }
  
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY not found.\n' +
    'Set it in one of these locations:\n' +
    '  1. Root: .env.local (preferred for root-level scripts)\n' +
    '  2. Web package: packages/web/.env.local (for web-specific scripts)\n' +
    '  3. Environment variable: SUPABASE_SERVICE_ROLE_KEY\n\n' +
    'Example: echo "SUPABASE_SERVICE_ROLE_KEY=your-secret-key" >> .env.local'
  )
}

// Create client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, getServiceRoleKey(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function queryUsers() {
  console.log('🔍 Querying users table (bypassing RLS with service role)...\n')
  console.log(`Database: ${supabaseUrl}\n`)

  const { data, error, count } = await supabase
    .from('users')
    .select('id, email, auth_id, name, email_notifications, marketing_notifications, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`📊 Total users: ${count || data?.length || 0}\n`)
  console.log('='.repeat(120))
  console.log('ID'.padEnd(38), 'Email'.padEnd(30), 'Auth ID'.padEnd(38), 'Name'.padEnd(15), 'Created At')
  console.log('-'.repeat(120))
  
  if (!data || data.length === 0) {
    console.log('No users found.')
  } else {
    data.forEach(user => {
      const id = (user.id || '').substring(0, 36)
      const email = (user.email || '').substring(0, 28)
      const authId = (user.auth_id || 'NULL').substring(0, 36)
      const name = (user.name || 'N/A').substring(0, 13)
      const createdAt = user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A'
      
      console.log(id.padEnd(38), email.padEnd(30), authId.padEnd(38), name.padEnd(15), createdAt)
    })
  }
  
  console.log('='.repeat(120))
  console.log(`\n✅ Showing ${data?.length || 0} of ${count || 0} users`)
}

async function queryPresentations() {
  console.log('🔍 Querying presentations table (bypassing RLS with service role)...\n')
  
  const { data, error, count } = await supabase
    .from('presentations')
    .select('id, title, user_id, gamma_url, start_time, total_duration, created_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`📊 Total presentations: ${count || data?.length || 0}\n`)
  console.log('='.repeat(140))
  console.log('ID'.padEnd(38), 'Title'.padEnd(30), 'User ID'.padEnd(38), 'URL'.padEnd(25), 'Updated')
  console.log('-'.repeat(140))
  
  if (!data || data.length === 0) {
    console.log('No presentations found.')
  } else {
    data.forEach(p => {
      const id = (p.id || '').substring(0, 36)
      const title = (p.title || '').substring(0, 28)
      const userId = (p.user_id || 'NULL').substring(0, 36)
      const url = (p.gamma_url || '').substring(0, 23)
      const updated = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : 'N/A'
      
      console.log(id.padEnd(38), title.padEnd(30), userId.padEnd(38), url.padEnd(25), updated)
    })
  }
  
  console.log('='.repeat(140))
  console.log(`\n✅ Showing ${data?.length || 0} of ${count || 0} presentations`)
}

async function runCustomQuery(sql: string) {
  console.log('🔍 Running custom query (bypassing RLS with service role)...\n')
  console.log(`Query: ${sql}\n`)
  
  // Note: Supabase client doesn't support raw SQL directly
  // This is a placeholder - would need to use direct PostgreSQL connection
  console.log('⚠️  Custom SQL queries require direct PostgreSQL connection.')
  console.log('Use: supabase db remote --linked sql "YOUR_SQL_HERE"')
  console.log('Or: psql with connection string from Supabase dashboard')
}

async function inspectTable(tableName: string) {
  console.log(`🔍 Inspecting table: ${tableName} (bypassing RLS with service role)...\n`)
  
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(10)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`📊 Row count: ${count || 0}`)
  console.log(`📋 Sample data (${data?.length || 0} rows):\n`)
  console.log(JSON.stringify(data, null, 2))
}

// Main
const command = process.argv[2]
const arg = process.argv[3]

try {
  switch (command) {
    case 'users':
      await queryUsers()
      break
    case 'presentations':
      await queryPresentations()
      break
    case 'query':
      if (!arg) {
        console.error('❌ Usage: node scripts/inspect-remote.ts query "SELECT * FROM users;"')
        process.exit(1)
      }
      await runCustomQuery(arg)
      break
    case 'inspect':
      if (!arg || !arg.startsWith('table ')) {
        console.error('❌ Usage: node scripts/inspect-remote.ts inspect table <tablename>')
        process.exit(1)
      }
      const tableName = arg.replace('table ', '')
      await inspectTable(tableName)
      break
    default:
      console.log('Usage:')
      console.log('  node scripts/inspect-remote.ts users')
      console.log('  node scripts/inspect-remote.ts presentations')
      console.log('  node scripts/inspect-remote.ts inspect table <tablename>')
      console.log('\nNote: Requires SUPABASE_SERVICE_ROLE_KEY in packages/web/.env.local')
      process.exit(1)
  }
} catch (error) {
  console.error('❌', error instanceof Error ? error.message : error)
  process.exit(1)
}

