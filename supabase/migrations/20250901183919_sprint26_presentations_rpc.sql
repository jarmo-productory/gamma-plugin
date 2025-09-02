-- Sprint 26: Presentations save/read RPCs and unique index adjustment

-- 1) Adjust unique constraint to be per-user
DO $$
BEGIN
  -- Drop legacy global unique on gamma_url if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'presentations_gamma_url_key'
  ) THEN
    ALTER TABLE public.presentations DROP CONSTRAINT presentations_gamma_url_key;
  END IF;

  -- Create composite unique if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.presentations'::regclass 
      AND contype = 'u' 
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.presentations'::regclass AND attname = 'user_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.presentations'::regclass AND attname = 'gamma_url')
      ]
  ) THEN
    ALTER TABLE public.presentations 
      ADD CONSTRAINT presentations_user_url_unique UNIQUE (user_id, gamma_url);
  END IF;
END $$;

-- 2) Upsert RPC (SECURITY DEFINER, VOLATILE, hardened search_path)
CREATE OR REPLACE FUNCTION public.rpc_upsert_presentation_from_device(
  p_user_id uuid,
  p_gamma_url text,
  p_title text,
  p_timetable_data jsonb,
  p_start_time text DEFAULT NULL,
  p_total_duration integer DEFAULT NULL
)
RETURNS SETOF public.presentations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  -- Ensure user exists to prevent orphaned rows
  SELECT TRUE INTO _exists FROM public.users WHERE id = p_user_id LIMIT 1;
  IF NOT COALESCE(_exists, FALSE) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  INSERT INTO public.presentations (user_id, title, gamma_url, start_time, total_duration, timetable_data, updated_at)
  VALUES (
    p_user_id,
    p_title,
    p_gamma_url,
    COALESCE(p_start_time, '09:00'),
    COALESCE(p_total_duration, 0),
    p_timetable_data,
    NOW()
  )
  ON CONFLICT (user_id, gamma_url)
  DO UPDATE SET
    title = EXCLUDED.title,
    start_time = COALESCE(EXCLUDED.start_time, public.presentations.start_time),
    total_duration = COALESCE(EXCLUDED.total_duration, public.presentations.total_duration),
    timetable_data = EXCLUDED.timetable_data,
    updated_at = NOW()
  RETURNING *;
END;
$$;

-- Mark as VOLATILE (default for plpgsql), harden privileges
REVOKE ALL ON FUNCTION public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_presentation_from_device(uuid, text, text, jsonb, text, integer) TO anon, authenticated;

-- 3) Read RPCs (SECURITY DEFINER, search_path hardened)
CREATE OR REPLACE FUNCTION public.rpc_get_presentation_by_url(
  p_user_id uuid,
  p_gamma_url text
)
RETURNS SETOF public.presentations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.presentations
  WHERE user_id = p_user_id AND gamma_url = p_gamma_url
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_presentation_by_url(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_presentation_by_url(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_list_presentations(
  p_user_id uuid
)
RETURNS SETOF public.presentations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.presentations
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.rpc_list_presentations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_list_presentations(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_presentation_by_id(
  p_user_id uuid,
  p_id uuid
)
RETURNS SETOF public.presentations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.presentations
  WHERE user_id = p_user_id AND id = p_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_presentation_by_id(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_presentation_by_id(uuid, uuid) TO anon, authenticated;

