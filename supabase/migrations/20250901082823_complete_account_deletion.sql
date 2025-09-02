-- Only apply the parts that don't exist yet

-- 2) RPC to delete caller's data under RLS (CREATE OR REPLACE will handle if it exists)
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_auth_id UUID;
  v_user_id UUID;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_auth_id := auth.uid();

  -- Capture current user row (if exists) for audit email and cascading deletes
  SELECT u.id, u.email INTO v_user_id, v_email
  FROM public.users u
  WHERE u.auth_id = v_auth_id;

  -- Delete device tokens tied to this auth user (device_tokens.user_id stores auth UUID as text)
  DELETE FROM public.device_tokens dt
  WHERE dt.user_id = v_auth_id::text;

  -- Delete user row (presentations should cascade via FK ON DELETE CASCADE)
  DELETE FROM public.users u
  WHERE u.auth_id = v_auth_id;

  -- Record audit event
  INSERT INTO public.account_deletion_events (auth_id, email, requested_at, data_deleted_at, status)
  VALUES (v_auth_id, v_email, NOW(), NOW(), 'DATA_DELETED');

  RETURN TRUE;
END;
$$;

-- Grant execute permission (safe to run multiple times)
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Add comment (safe to run multiple times)
COMMENT ON FUNCTION public.delete_my_account() IS 'Delete the authenticated user''s data (device tokens, cascading presentations, user row). Inserts audit event. RLS enforced.';