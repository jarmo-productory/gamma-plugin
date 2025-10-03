-- DEPLOY THIS IN SUPABASE SQL EDITOR
-- Restores exchange_device_code to working Sprint 35 state

DROP FUNCTION IF EXISTS public.exchange_device_code(text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.exchange_device_code(
  input_code text,
  input_device_id text,
  input_device_name text,
  raw_token text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg record;
  token_hash text;
BEGIN
  -- Validate registration exists, linked, not expired, and device matches
  SELECT * INTO reg
  FROM public.device_registrations r
  WHERE r.code = input_code
    AND r.device_id = input_device_id
    AND r.linked = true
    AND r.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Hash the token (hex encoding)
  token_hash := encode(digest(raw_token, 'sha256'), 'hex');

  -- Insert token row (uses "token" column, not "token_hash")
  INSERT INTO public.device_tokens (
    token, device_id, user_id, user_email, device_name,
    issued_at, expires_at, last_used
  ) VALUES (
    token_hash, input_device_id, reg.user_id, reg.user_email, input_device_name,
    now(), p_expires_at, now()
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) TO anon, authenticated;

-- Test it works with your test registration
DO $$
DECLARE
  result boolean;
  test_token text := 'test_token_' || gen_random_uuid()::text;
BEGIN
  SELECT exchange_device_code(
    'TESTCODE123',
    'device_test_1759516830.790008',
    'Test Device',
    test_token,
    NOW() + INTERVAL '24 hours'
  ) INTO result;

  RAISE NOTICE 'RPC Result: %', result;

  IF result THEN
    RAISE NOTICE 'SUCCESS: Device token exchange worked!';
  ELSE
    RAISE NOTICE 'FAILED: Check registration is linked and not expired';
  END IF;
END $$;

-- Verify token was stored
SELECT
  device_id,
  user_id,
  device_name,
  length(token) as token_length,
  expires_at
FROM device_tokens
WHERE device_id = 'device_test_1759516830.790008';
