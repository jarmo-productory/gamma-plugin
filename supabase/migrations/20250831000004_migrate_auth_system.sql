-- Migrate from Clerk to Supabase Auth system
-- Update users table to work with Supabase Auth instead of Clerk

-- Step 1: Add auth_id column for Supabase auth users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Step 2: Drop the old RLS policies that reference clerk_id
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;

-- Step 3: Create new RLS policies using auth_id (Supabase Auth)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Step 4: Create new RLS policies for presentations using auth_id
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Step 5: Create index on auth_id for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Step 6: Add constraint to ensure auth_id uniqueness (compatible approach)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_id_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_id_unique UNIQUE (auth_id);
  END IF;
END $$;