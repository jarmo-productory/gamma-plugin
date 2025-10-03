-- Fix: Device-token authentication requires SECURITY DEFINER RPC to create user records
-- The existing ensureUserRecord helper fails in device-token context because:
-- 1. It uses anon client which can't bypass RLS on users table
-- 2. It passes wrong parameter (dbUserId instead of auth_id)
-- This RPC bypasses RLS to upsert user by auth_id and return the canonical users.id

CREATE OR REPLACE FUNCTION public.rpc_sync_user_from_auth(
  p_auth_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Upsert user record by auth_id (bypasses RLS via SECURITY DEFINER)
  INSERT INTO public.users (auth_id, email, created_at, updated_at)
  VALUES (p_auth_id, p_email, NOW(), NOW())
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- Security: Grant execute to anon and authenticated roles only
REVOKE ALL ON FUNCTION public.rpc_sync_user_from_auth(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sync_user_from_auth(uuid, text) TO anon, authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.rpc_sync_user_from_auth IS
  'SECURITY DEFINER RPC for device-token auth path. Creates or updates user record by auth_id, returns users.id for use in other RPCs.';
