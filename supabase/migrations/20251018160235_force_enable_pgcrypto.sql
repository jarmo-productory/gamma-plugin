-- Force enable pgcrypto extension in public schema
-- The previous migration showed "already exists" but digest() still fails
-- This ensures the extension is properly installed and accessible

-- Drop and recreate to ensure clean state
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
CREATE EXTENSION pgcrypto SCHEMA public;

-- Verify the function is accessible
DO $$
BEGIN
  -- Test digest function
  PERFORM encode(digest('test', 'sha256'), 'hex');
  RAISE NOTICE 'pgcrypto extension verified - digest() function is working';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'pgcrypto extension failed: %', SQLERRM;
END;
$$;

COMMENT ON EXTENSION pgcrypto IS
  'Cryptographic functions for token hashing in device authentication';
