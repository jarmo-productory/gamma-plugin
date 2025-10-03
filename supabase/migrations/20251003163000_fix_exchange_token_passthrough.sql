-- Fix: exchange_device_code must use the raw_token from API, not generate a new one
-- Bug: upsert_device_by_fingerprint generates its own token, causing mismatch
-- Solution: Always use fallback path that respects the raw_token parameter

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
SET search_path = public
AS $$
DECLARE
  reg record;
  token_hash text;
BEGIN
  -- Validate registration exists, linked, not expired, and device matches
  SELECT * INTO reg
  FROM public.device_registrations
  WHERE code = input_code
    AND device_id = input_device_id
    AND linked = true
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Hash the raw_token provided by the API (base64 encoding to match validate_and_touch_token)
  token_hash := encode(digest(raw_token, 'sha256'), 'base64');

  -- Insert token (use ON CONFLICT to handle duplicate device_id for same user)
  INSERT INTO public.device_tokens (
    token_hash,
    device_id,
    device_fingerprint,
    user_id,
    user_email,
    device_name,
    issued_at,
    expires_at,
    last_used,
    created_at,
    updated_at
  ) VALUES (
    token_hash,
    input_device_id,
    reg.device_fingerprint,  -- Include fingerprint from registration
    reg.user_id,
    reg.user_email,
    input_device_name,
    now(),
    p_expires_at,
    now(),
    now(),
    now()
  )
  ON CONFLICT (device_id)
  DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    user_id = EXCLUDED.user_id,
    user_email = EXCLUDED.user_email,
    device_name = EXCLUDED.device_name,
    expires_at = EXCLUDED.expires_at,
    last_used = now(),
    updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) IS
  'Exchange device pairing code for token. Uses the raw_token from API (not generated). Base64 SHA-256 hashing to match validate_and_touch_token.';
