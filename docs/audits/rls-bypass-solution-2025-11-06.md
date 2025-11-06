# RLS Bypass Solution for Database CLI Tools

**Problem Identified:** Row Level Security (RLS) blocks queries when using Supabase client with anon keys, making CLI inspection tools useless for viewing actual data.

**Solution:** Use direct PostgreSQL connections (bypasses RLS) for inspection, while keeping RLS enabled for production security.

---

## 🔧 Solution 1: Direct PostgreSQL Connection (RECOMMENDED)

### For Local Database ✅ (Already Works)

The `db-inspect.ts` script already uses direct `psql` connection which bypasses RLS:

```typescript
const DB_URL = 'postgresql://postgres:postgres@localhost:54322/postgres';
```

**This works perfectly** - direct PostgreSQL connection doesn't respect RLS policies.

### For Remote Database ⚠️ (Needs Fix)

**Current Problem:**
- Remote queries use Supabase client with anon key → RLS blocks everything
- Need direct PostgreSQL connection string for remote database

**Solution:**
```bash
# Get remote database connection string from Supabase CLI
supabase db remote --linked

# Or use direct connection:
# postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

---

## 🔧 Solution 2: Service Role Key for Remote Inspection

Create inspection scripts that use service role key (bypasses RLS):

```typescript
// scripts/inspect-remote.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

function getServiceRoleKey(): string {
  // Try env var first
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY
  }
  
  // Try .env.local
  try {
    const envPath = join(process.cwd(), 'packages/web/.env.local')
    const env = readFileSync(envPath, 'utf-8')
    const match = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    if (match) return match[1].trim()
  } catch {}
  
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not found. Set it in .env.local')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getServiceRoleKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Now queries bypass RLS
```

---

## 🔧 Solution 3: Supabase CLI Direct Connection

Use Supabase CLI's direct database connection:

```bash
# Get connection string
supabase db remote --linked

# Use psql directly with connection string
psql "postgresql://postgres.[ref]:[password]@[host]:6543/postgres" \
  -c "SELECT * FROM users LIMIT 10;"
```

---

## 📝 Updated Documentation

### For Local Development ✅

**Already works!** Direct PostgreSQL connection bypasses RLS:

```bash
npm run db:start              # Start local Supabase
npm run db:inspect table users  # Works perfectly (bypasses RLS)
npm run db:users              # Shows all users
```

### For Remote Database ⚠️

**Two options:**

**Option A: Use Service Role Key (Recommended)**
```bash
# Set service role key in .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=your-secret-key" >> packages/web/.env.local

# Use inspection script with service role
node scripts/inspect-remote.ts users
```

**Option B: Use Direct PostgreSQL Connection**
```bash
# Get connection string from Supabase dashboard
# Settings → Database → Connection string → Direct connection

# Use psql directly
psql "postgresql://postgres.[ref]:[pass]@[host]:6543/postgres" \
  -c "SELECT * FROM users LIMIT 10;"
```

---

## 🎯 Updated Commands

### New Remote Inspection Commands

Add to `package.json`:

```json
{
  "scripts": {
    "db:remote:users": "node scripts/inspect-remote.ts users",
    "db:remote:presentations": "node scripts/inspect-remote.ts presentations",
    "db:remote:query": "node scripts/inspect-remote.ts query",
    "db:remote:inspect": "node scripts/inspect-remote.ts inspect"
  }
}
```

---

## ⚠️ Security Note

**Important:** Service role key bypasses ALL RLS policies. 

**Safe Usage:**
- ✅ Local development inspection
- ✅ Admin scripts (run locally, not in production)
- ✅ Migration validation
- ✅ Debugging queries

**Never:**
- ❌ Expose service role key in client-side code
- ❌ Use in production API routes (except admin endpoints)
- ❌ Commit service role key to git

---

## ✅ Verification

Test that RLS bypass works:

```bash
# Local (should work)
npm run db:start
npm run db:users  # Should show all users

# Remote (should work with service role)
node scripts/inspect-remote.ts users  # Should show all users
```

---

## 📚 Updated Workflow

### Development Workflow (Local)

```bash
# 1. Start local database (no RLS blocking)
npm run db:start

# 2. Inspect freely (direct PostgreSQL connection)
npm run db:inspect table users
npm run db:users

# 3. Create migration
npm run db:migration:new "add_column"

# 4. Test locally
npm run db:reset

# 5. Deploy to production
npm run db:push
```

### Remote Inspection Workflow

```bash
# Option 1: Use service role script
node scripts/inspect-remote.ts users

# Option 2: Use Supabase CLI direct connection
supabase db remote --linked sql "SELECT * FROM users LIMIT 10;"

# Option 3: Use psql with connection string
psql "$(supabase db remote --linked)" -c "SELECT * FROM users;"
```

---

**Status:** ✅ Solution identified, implementation needed  
**Priority:** HIGH - Blocks all remote database inspection  
**Effort:** ~30 minutes to implement

