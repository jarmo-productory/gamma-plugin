-- Sprint 37: Device token presentation save flow hardening
-- Move user synchronization inside rpc_upsert_presentation_from_device so device-token
-- requests never depend on a separate RPC round-trip.

DROP FUNCTION IF EXISTS public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer);

CREATE OR REPLACE FUNCTION public.rpc_upsert_presentation_from_device(
  p_auth_id uuid,
  p_gamma_url text,
  p_title text,
  p_timetable_data jsonb,
  p_start_time text DEFAULT NULL,
  p_total_duration integer DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS SETOF public.presentations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_start_time text;
  v_total_duration integer;
BEGIN
  IF p_auth_id IS NULL THEN
    RAISE EXCEPTION 'auth_id is required' USING ERRCODE = '22004';
  END IF;

  -- Upsert the first-party user row based on Supabase auth_id
  INSERT INTO public.users (auth_id, email, created_at, updated_at)
  VALUES (p_auth_id, p_email, NOW(), NOW())
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  v_start_time := COALESCE(NULLIF(p_start_time, ''), '09:00');
  v_total_duration := COALESCE(p_total_duration, 0);

  RETURN QUERY
  INSERT INTO public.presentations (
    user_id,
    title,
    gamma_url,
    start_time,
    total_duration,
    timetable_data,
    updated_at
  )
  VALUES (
    v_user_id,
    p_title,
    p_gamma_url,
    v_start_time,
    v_total_duration,
    p_timetable_data,
    NOW()
  )
  ON CONFLICT (user_id, gamma_url)
  DO UPDATE SET
    title = EXCLUDED.title,
    start_time = COALESCE(NULLIF(EXCLUDED.start_time, ''), public.presentations.start_time),
    total_duration = COALESCE(EXCLUDED.total_duration, public.presentations.total_duration),
    timetable_data = EXCLUDED.timetable_data,
    updated_at = NOW()
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer, text) TO anon, authenticated;

COMMENT ON FUNCTION public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer, text) IS
  'Device-token save RPC: syncs user by auth_id and upserts presentation in a single security-definer operation.';
