-- Align presentations RLS with users.id FK by joining via users.auth_id

-- Drop any direct-auth policies
DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;

-- Recreate policies that enforce ownership via users.auth_id = auth.uid()
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

