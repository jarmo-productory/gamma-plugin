# Database Development Guide - CLI-First Workflow

**Last Updated:** 2025-11-06
**Version:** 1.0.0

---

## 🎯 Overview

This guide establishes a **CLI-first database development workflow** that enables Cursor (and other AI coding agents) to inspect, modify, and debug database state without requiring dashboard access.

### ⚠️ Important: RLS Bypass for Inspection

**Local Database:** Direct PostgreSQL connection (`psql`) bypasses RLS automatically ✅  
**Remote Database:** Use service role key in inspection scripts to bypass RLS for development ✅

**Security Note:** Service role key bypasses ALL RLS policies. Only use for local development and admin tasks. Never expose in client-side code.

### Key Benefits

✅ **Cursor can see database state** - Full schema, data, and policy visibility  
✅ **No context loss** - All operations happen in terminal, preserving AI agent context  
✅ **Faster iteration** - Commands execute immediately, no browser switching  
✅ **Version controlled** - All changes tracked in migration files  
✅ **Production safe** - Dry-run capabilities and local testing first  

---

## 🚀 Quick Start

### 1. Start Local Database

```bash
# Start Supabase (PostgreSQL on port 54322)
npm run db:start

# Check status
npm run db:status
```

### 2. Inspect Database

```bash
# View all tables
npm run db:tables

# Inspect specific table
npm run db:inspect table presentations

# Check recent data
npm run db:presentations
```

### 3. Create Migration

```bash
# Create new migration
npm run db:migration:new "add_favorite_column"

# Edit the generated file in supabase/migrations/
# Add your SQL

# Test locally
npm run db:reset

# Verify
npm run db:schema:table "\\d presentations"
```

### 4. Deploy

```bash
# Dry run first
npm run db:push:dry

# Deploy to production
npm run db:push
```

---

## 📋 Available Commands

### Database Lifecycle

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Check if database is running |
| `npm run db:logs` | View PostgreSQL logs |

### Schema Inspection

| Command | Description |
|---------|-------------|
| `npm run db:tables` | List all tables |
| `npm run db:schema` | View all schemas |
| `npm run db:schema:table "\\d <table>"` | View specific table structure |
| `npm run db:indexes` | List all indexes |
| `npm run db:policies` | List all RLS policies |
| `npm run db:triggers` | List all triggers |
| `npm run db:functions` | List all functions/RPCs |

### Data Inspection

| Command | Description |
|---------|-------------|
| `npm run db:presentations` | View recent presentations |
| `npm run db:users` | View recent users |
| `npm run db:tokens` | View recent device tokens |
| `npm run db:fingerprints` | View slide fingerprints |
| `npm run db:query "<sql>"` | Run custom query |

### Advanced Inspection

| Command | Description |
|---------|-------------|
| `npm run db:inspect table <name>` | Full table inspection |
| `npm run db:inspect rls <name>` | RLS policies for table |
| `npm run db:inspect constraints <name>` | Constraints for table |
| `npm run db:inspect count <name>` | Row count and size |
| `npm run db:inspect recent <name> [limit]` | Recent activity |
| `npm run db:inspect function <name>` | Function definition |
| `npm run db:inspect tables` | All tables with sizes |
| `npm run db:inspect functions` | All functions |
| `npm run db:inspect diff` | Schema diff (local vs remote) |

### Performance Analysis

| Command | Description |
|---------|-------------|
| `npm run db:explain "<sql>"` | Explain query performance |
| `npm run db:inspect explain "<sql>"` | Detailed performance analysis |

### Migrations

| Command | Description |
|---------|-------------|
| `npm run db:migration:new "<name>"` | Create new migration |
| `npm run db:reset` | Reset + apply all migrations |
| `npm run db:migrations` | List migration status |
| `npm run db:diff` | Show local vs remote differences |
| `npm run db:push` | Deploy migrations to production |
| `npm run db:push:dry` | Dry-run deployment |
| `npm run db:pull` | Pull schema from production |

### Backup & Restore

| Command | Description |
|---------|-------------|
| `npm run db:dump` | Backup data (timestamped) |
| `npm run db:dump:schema` | Backup schema only |
| `npm run db:seed <file>` | Restore from backup |

### Production Access

| Command | Description |
|---------|-------------|
| `npm run db:prod:query "<sql>"` | Query production database |
| `npm run db:prod:tables` | List production tables |
| `npm run db:prod:functions` | List production functions |
| `npm run db:remote:users` | View remote users (bypasses RLS) |
| `npm run db:remote:presentations` | View remote presentations (bypasses RLS) |
| `npm run db:remote:inspect table <name>` | Inspect remote table (bypasses RLS) |

**Note:** Remote inspection commands use service role key to bypass RLS. Safe for local development only.

**Setup:** Add `SUPABASE_SERVICE_ROLE_KEY` to root `.env.local` (preferred) or `packages/web/.env.local`. The script checks both locations automatically.

### Direct Access

| Command | Description |
|---------|-------------|
| `npm run db:psql` | Interactive psql shell |

---

## 🛠️ Development Workflows

### Workflow 1: Adding a New Column

```bash
# 1. Inspect current state
npm run db:inspect table presentations

# 2. Create migration
npm run db:migration:new "add_tags_column"

# 3. Edit migration file
cat > supabase/migrations/20251106XXXXXX_add_tags_column.sql << 'EOF'
-- Add tags column
ALTER TABLE presentations ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add GIN index for array searches
CREATE INDEX idx_presentations_tags ON presentations USING gin(tags);

-- Add comment
COMMENT ON COLUMN presentations.tags IS 'User-defined tags for categorization';
EOF

# 4. Test locally
npm run db:reset

# 5. Verify
npm run db:schema:table "\\d presentations"
npm run db:query "SELECT id, title, tags FROM presentations LIMIT 5;"

# 6. Deploy
npm run db:push:dry  # Check what will be deployed
npm run db:push      # Deploy to production
```

### Workflow 2: Adding RLS Policy

```bash
# 1. Check existing policies
npm run db:inspect rls presentations

# 2. Create migration
npm run db:migration:new "add_public_read_policy"

# 3. Write policy
cat > supabase/migrations/20251106XXXXXX_add_public_read_policy.sql << 'EOF'
-- Allow public read access to published presentations
CREATE POLICY "public_read_published" ON presentations
  FOR SELECT
  USING (published = true);
EOF

# 4. Test
npm run db:reset
npm run db:inspect rls presentations

# 5. Test the policy works
npm run db:query "SET ROLE anon; SELECT COUNT(*) FROM presentations;"

# 6. Deploy
npm run db:push
```

### Workflow 3: Creating New Table

```bash
# 1. Check if table exists
npm run db:tables | grep comments

# 2. Create migration
npm run db:migration:new "create_comments_table"

# 3. Write complete table with RLS
cat > supabase/migrations/20251106XXXXXX_create_comments_table.sql << 'EOF'
-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_presentation ON comments(presentation_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "users_read_own_comments" ON comments
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_comments" ON comments
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
EOF

# 4. Test
npm run db:reset
npm run db:inspect table comments
npm run db:inspect rls comments

# 5. Deploy
npm run db:push
```

### Workflow 4: Modifying RPC Function

```bash
# 1. Inspect current function
npm run db:inspect function rpc_upsert_presentation_from_device

# 2. Create migration
npm run db:migration:new "update_upsert_rpc"

# 3. Drop and recreate (use CREATE OR REPLACE)
cat > supabase/migrations/20251106XXXXXX_update_upsert_rpc.sql << 'EOF'
CREATE OR REPLACE FUNCTION rpc_upsert_presentation_from_device(
  p_auth_id UUID,
  p_gamma_url TEXT,
  p_title TEXT,
  p_timetable_data JSONB,
  p_start_time TEXT DEFAULT '09:00',
  p_total_duration INTEGER DEFAULT 0,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  gamma_url TEXT,
  start_time TEXT,
  total_duration INTEGER,
  timetable_data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Updated function body
  -- ...
END;
$$;
EOF

# 4. Test
npm run db:reset
npm run db:inspect function rpc_upsert_presentation_from_device

# 5. Deploy
npm run db:push
```

---

## 🐛 Debugging Patterns

### Pattern 1: Migration Fails

```bash
# Check error in logs
npm run db:logs

# Inspect current state
npm run db:inspect table <tablename>
npm run db:inspect constraints <tablename>

# Check for conflicts
npm run db:policies
npm run db:triggers

# Fix and retry
npm run db:reset
```

### Pattern 2: RLS Blocking Query

```bash
# Check policies
npm run db:inspect rls presentations

# Test as authenticated user
npm run db:query "SET ROLE authenticated; SET request.jwt.claims TO '{\"sub\":\"test-user-id\"}'; SELECT * FROM presentations;"

# Check user exists
npm run db:users
```

### Pattern 3: Slow Query

```bash
# Analyze performance
npm run db:explain "SELECT * FROM presentations WHERE user_id = 'abc-123';"

# Check indexes
npm run db:indexes | grep presentations

# Check table size
npm run db:inspect count presentations
```

### Pattern 4: Production Out of Sync

```bash
# Check migration status
npm run db:migrations

# View differences
npm run db:diff

# Check production state
npm run db:prod:tables
npm run db:prod:query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# Repair if needed (careful!)
supabase migration repair --status reverted <migration_id>
npm run db:push
```

---

## 🎓 Best Practices

### 1. Always Inspect First

```bash
# Before any change, check current state
npm run db:inspect table <tablename>
npm run db:inspect rls <tablename>
npm run db:inspect constraints <tablename>
```

### 2. Test Locally Always

```bash
# Never deploy untested migrations
npm run db:reset          # Apply locally
npm run db:inspect table  # Verify
npm run db:push:dry      # Dry run
npm run db:push          # Deploy
```

### 3. Use Descriptive Migration Names

```bash
# ✅ Good
npm run db:migration:new "add_favorite_column_to_presentations"

# ❌ Bad
npm run db:migration:new "update"
```

### 4. Document Migrations

```sql
-- Always add comments to migrations
-- Migration: Add tags for presentation categorization
-- Author: DevTeam
-- Date: 2025-11-06
-- Ticket: FEAT-123

ALTER TABLE presentations ADD COLUMN tags TEXT[] DEFAULT '{}';
CREATE INDEX idx_presentations_tags ON presentations USING gin(tags);
```

### 5. Keep Migrations Atomic

```sql
-- Each migration should be self-contained and reversible

-- ✅ Good: Single logical change
ALTER TABLE presentations ADD COLUMN tags TEXT[] DEFAULT '{}';

-- ❌ Bad: Multiple unrelated changes
ALTER TABLE presentations ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN preferences JSONB;
CREATE TABLE comments (...);
```

---

## 📚 Examples Script

We've included a comprehensive examples script:

```bash
# View all examples
./scripts/db-examples.sh

# Shows:
# - Common inspection patterns
# - Migration workflows
# - Debugging techniques
# - Production access patterns
```

---

## ⚠️ Common Pitfalls

### ❌ Pitfall 1: Using Dashboard Instead of CLI

**Problem:** Opening Supabase Dashboard loses Cursor context

**Solution:** Use CLI commands exclusively

```bash
# ❌ Wrong
"Open Supabase Dashboard and check the table"

# ✅ Right
npm run db:inspect table presentations
```

### ❌ Pitfall 2: Skipping Local Testing

**Problem:** Deploying untested migrations breaks production

**Solution:** Always test locally first

```bash
# ✅ Right workflow
npm run db:reset          # Test locally
npm run db:inspect table  # Verify
npm run db:push:dry       # Dry run
npm run db:push           # Deploy
```

### ❌ Pitfall 3: Guessing About Schema

**Problem:** Creating migrations without checking current state

**Solution:** Inspect before modifying

```bash
# ✅ Always check first
npm run db:inspect table presentations
npm run db:inspect constraints presentations
npm run db:inspect rls presentations
```

---

## 🔧 Troubleshooting

### Database Won't Start

```bash
# Check Docker status
docker ps

# Check logs
npm run db:logs

# Restart
npm run db:stop
npm run db:start
```

### Can't Connect to Database

```bash
# Check if running on correct port
npm run db:status | grep "DB URL"

# Should show: postgresql://postgres:postgres@localhost:54322/postgres
```

### Migration Conflicts

```bash
# Check migration status
npm run db:migrations

# View what's different
npm run db:diff

# Repair if needed
supabase migration repair --status reverted <migration_id>
```

### Production Query Fails

```bash
# Check if linked to project
supabase link

# Verify credentials
cat .env.local | grep SUPABASE

# Test connection
npm run db:prod:tables
```

---

## 📖 Related Documentation

- [Cursor Rules: Database Workflow](.cursor/rules/database.mdc)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Architecture: Database Schema](ARCHITECTURE.md#database-schema)

---

## 🆘 Support

If you encounter issues:

1. Check this guide first
2. Run `./scripts/db-examples.sh` for quick reference
3. Check database logs: `npm run db:logs`
4. Inspect current state: `npm run db:inspect table <name>`
5. Ask in team chat with command output

---

**Document Maintained By:** Development Team  
**Last Updated:** 2025-11-06  
**Next Review:** After Sprint 40 or major database changes

