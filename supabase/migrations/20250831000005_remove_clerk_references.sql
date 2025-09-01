-- Sprint 21: Remove Clerk Authentication References
-- Remove all traces of Clerk from database schema and RLS policies

-- Step 1: Update RLS policies to use direct Supabase Auth (auth.uid() = users.id)
-- Drop old Clerk-based policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;

-- Create new Supabase Auth native policies (using auth_id from Sprint 19)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own data" ON users  
  FOR UPDATE USING (auth.uid() = auth_id);

-- For presentations, user_id should reference users.id, but we filter by auth ownership
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Step 2: Drop the clerk_id column (no longer needed)
ALTER TABLE users DROP COLUMN IF EXISTS clerk_id;

-- Add comment for documentation
COMMENT ON TABLE users IS 'User accounts using Supabase Auth native (post-Clerk removal Sprint 21)';
COMMENT ON TABLE presentations IS 'User presentations with direct user_id foreign key to users.id (Supabase Auth UUID)';