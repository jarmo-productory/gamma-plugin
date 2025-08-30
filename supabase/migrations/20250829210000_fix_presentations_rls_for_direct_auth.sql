-- Fix presentations RLS policies to work with direct auth.uid() 
-- instead of requiring users table lookup

-- Drop existing policies that depend on users table
DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;  
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;

-- Create new policies that work directly with auth.uid()
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (user_id = auth.uid());