import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dknqqcnnbcqujeffbmmb.supabase.co'

// Try to get service role key from env or .env.local file
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  try {
    const envLocalPath = join(process.cwd(), 'packages/web/.env.local')
    const envLocal = readFileSync(envLocalPath, 'utf-8')
    const match = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    if (match) {
      supabaseKey = match[1].trim()
    }
  } catch (e) {
    // Fallback to anon key if service role not found
    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM'
    console.log('⚠️  Using anon key (RLS will filter results). For full data, set SUPABASE_SERVICE_ROLE_KEY')
  }
}

// Use service role key if available (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function queryUsers() {
  console.log('Querying users table from remote database...\n')
  console.log(`Database URL: ${supabaseUrl}\n`)

  // Query users table
  const { data, error, count } = await supabase
    .from('users')
    .select('id, email, auth_id, name, email_notifications, marketing_notifications, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error querying users:', error)
    process.exit(1)
  }

  console.log(`Total users found: ${count || data?.length || 0}\n`)
  console.log('Users data:')
  console.log('='.repeat(100))
  
  if (!data || data.length === 0) {
    console.log('No users found in the database.')
  } else {
    // Format as table
    console.log('ID'.padEnd(38), 'Email'.padEnd(30), 'Auth ID'.padEnd(38), 'Name'.padEnd(15), 'Email Notif'.padEnd(12), 'Marketing'.padEnd(10), 'Created At')
    console.log('-'.repeat(160))
    
    data.forEach(user => {
      const id = (user.id || '').substring(0, 36)
      const email = (user.email || '').substring(0, 28)
      const authId = (user.auth_id || 'NULL').substring(0, 36)
      const name = (user.name || 'N/A').substring(0, 13)
      const emailNotif = user.email_notifications ? 'Yes' : 'No'
      const marketing = user.marketing_notifications ? 'Yes' : 'No'
      const createdAt = user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A'
      
      console.log(id.padEnd(38), email.padEnd(30), authId.padEnd(38), name.padEnd(15), emailNotif.padEnd(12), marketing.padEnd(10), createdAt)
    })
    
    console.log('\n' + '='.repeat(100))
    console.log(`\nShowing ${data.length} of ${count || data.length} users`)
  }
}

queryUsers().catch(console.error)

