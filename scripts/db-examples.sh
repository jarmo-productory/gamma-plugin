#!/bin/bash
# Database Development Examples - Quick Reference Guide
# This file contains practical examples for common database operations

set -e  # Exit on error

echo "============================================================"
echo "📚 Database Development Examples"
echo "============================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

function example() {
    echo -e "${YELLOW}# $1${NC}"
    echo -e "${GREEN}$2${NC}"
    echo ""
}

section "🚀 Getting Started"

example "Start local Supabase" \
"npm run db:start"

example "Check if database is running" \
"npm run db:status"

example "Interactive psql shell" \
"npm run db:psql"

example "Stop database" \
"npm run db:stop"

section "🔍 Inspecting Database Schema"

example "List all tables" \
"npm run db:tables"

example "View table structure" \
"npm run db:schema:table \"\\\\d presentations\""

example "Comprehensive table inspection" \
"npm run db:inspect table presentations"

example "Check all indexes" \
"npm run db:indexes"

example "Check all RLS policies" \
"npm run db:policies"

example "Check triggers" \
"npm run db:triggers"

example "List all functions/RPCs" \
"npm run db:functions"

section "📊 Querying Data"

example "Quick preview of presentations" \
"npm run db:presentations"

example "Quick preview of users" \
"npm run db:users"

example "Quick preview of device tokens" \
"npm run db:tokens"

example "Custom query" \
"npm run db:query \"SELECT COUNT(*) FROM presentations WHERE user_id IS NOT NULL;\""

example "Recent activity in a table" \
"npm run db:inspect recent presentations 20"

example "Count rows and check table size" \
"npm run db:inspect count presentations"

section "🛠️ Creating & Testing Migrations"

example "Create new migration" \
"npm run db:migration:new \"add_favorite_column\""

example "Apply all migrations (reset database)" \
"npm run db:reset"

example "Check migration status" \
"npm run db:migrations"

example "View differences between local and remote" \
"npm run db:diff"

section "📤 Deploying Migrations"

example "Dry-run deployment (test what would be deployed)" \
"npm run db:push:dry"

example "Deploy migrations to production" \
"npm run db:push"

example "Pull schema from production" \
"npm run db:pull"

section "🐛 Debugging & Performance"

example "Inspect RLS policies for a table" \
"npm run db:inspect rls presentations"

example "Check constraints on a table" \
"npm run db:inspect constraints presentations"

example "Explain query performance" \
"npm run db:explain \"SELECT * FROM presentations WHERE user_id = 'test-id';\""

example "Inspect function definition" \
"npm run db:inspect function rpc_upsert_presentation_from_device"

section "💾 Backup & Restore"

example "Backup data only" \
"npm run db:dump"

example "Backup schema only" \
"npm run db:dump:schema"

example "Restore from backup" \
"npm run db:seed backup_20251106_143022.sql"

section "🌐 Production Database Access"

example "Query production database" \
"npm run db:prod:query \"SELECT COUNT(*) FROM presentations;\""

example "List production tables" \
"npm run db:prod:tables"

example "List production functions" \
"npm run db:prod:functions"

section "🔧 Full Development Workflow Example"

echo -e "${YELLOW}Example: Adding a 'favorite' column to presentations${NC}"
echo ""
echo -e "${GREEN}# 1. Check current schema${NC}"
echo "npm run db:schema:table \"\\d presentations\""
echo ""
echo -e "${GREEN}# 2. Create migration${NC}"
echo "npm run db:migration:new \"add_favorite_column\""
echo ""
echo -e "${GREEN}# 3. Edit the migration file (opens in your editor)${NC}"
echo "# supabase/migrations/20251106XXXXXX_add_favorite_column.sql"
echo "cat > supabase/migrations/20251106XXXXXX_add_favorite_column.sql << 'EOF'"
echo "ALTER TABLE presentations ADD COLUMN favorite BOOLEAN DEFAULT false;"
echo "CREATE INDEX idx_presentations_favorite ON presentations(favorite) WHERE favorite = true;"
echo "EOF"
echo ""
echo -e "${GREEN}# 4. Test migration locally${NC}"
echo "npm run db:reset"
echo ""
echo -e "${GREEN}# 5. Verify the change${NC}"
echo "npm run db:schema:table \"\\d presentations\""
echo "npm run db:query \"SELECT id, title, favorite FROM presentations LIMIT 5;\""
echo ""
echo -e "${GREEN}# 6. Deploy to production${NC}"
echo "npm run db:push:dry  # Dry run first"
echo "npm run db:push      # Actual deployment"
echo ""

section "📝 Common Patterns"

echo -e "${YELLOW}Pattern 1: Check table before modifying${NC}"
echo "npm run db:inspect table presentations"
echo ""

echo -e "${YELLOW}Pattern 2: Debug RLS issues${NC}"
echo "npm run db:inspect rls presentations"
echo "npm run db:query \"SET ROLE authenticated; SELECT * FROM presentations LIMIT 5;\""
echo ""

echo -e "${YELLOW}Pattern 3: Performance analysis${NC}"
echo "npm run db:indexes"
echo "npm run db:explain \"SELECT * FROM presentations WHERE user_id = 'abc-123';\""
echo ""

echo -e "${YELLOW}Pattern 4: Check production state${NC}"
echo "npm run db:prod:query \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';\""
echo ""

section "⚠️  Troubleshooting"

echo -e "${RED}Problem: Migration fails with constraint error${NC}"
echo -e "${GREEN}Solution:${NC}"
echo "npm run db:inspect constraints presentations"
echo "npm run db:inspect table presentations"
echo ""

echo -e "${RED}Problem: Query returns no data (RLS blocking)${NC}"
echo -e "${GREEN}Solution:${NC}"
echo "npm run db:inspect rls presentations"
echo ""

echo -e "${RED}Problem: Slow query performance${NC}"
echo -e "${GREEN}Solution:${NC}"
echo "npm run db:indexes"
echo "npm run db:explain \"<your-slow-query>\""
echo ""

echo -e "${RED}Problem: Local and production out of sync${NC}"
echo -e "${GREEN}Solution:${NC}"
echo "npm run db:diff"
echo "npm run db:migrations"
echo ""

section "✅ Daily Development Workflow"

echo "1. Start your day:"
echo "   npm run dev:full  # Starts DB + Web + Extension"
echo ""
echo "2. Check database state:"
echo "   npm run db:status"
echo "   npm run db:tables"
echo ""
echo "3. Work on feature (inspect as needed):"
echo "   npm run db:inspect table <tablename>"
echo "   npm run db:inspect rls <tablename>"
echo ""
echo "4. Create migration when ready:"
echo "   npm run db:migration:new \"feature_name\""
echo ""
echo "5. Test locally:"
echo "   npm run db:reset"
echo "   npm run db:inspect table <tablename>"
echo ""
echo "6. Deploy when ready:"
echo "   npm run db:push:dry"
echo "   npm run db:push"
echo ""

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ All commands available! Type 'npm run' to see full list${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

