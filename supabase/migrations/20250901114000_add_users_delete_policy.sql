-- Sprint 24: Allow authenticated users to delete their own user row
-- This enables the account deletion RPC to remove the caller's user record
-- under RLS without using service-role.

-- Ensure RLS is enabled on users (should already be enabled in prior migrations)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a DELETE policy scoped to the authenticated caller
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can delete own data'
  ) THEN
    CREATE POLICY "Users can delete own data" ON public.users
      FOR DELETE
      TO authenticated
      USING (auth.uid() = auth_id);
  END IF;
END $$;

COMMENT ON POLICY "Users can delete own data" ON public.users IS
  'Permits authenticated users to delete their own user row (matched by auth_id).';

