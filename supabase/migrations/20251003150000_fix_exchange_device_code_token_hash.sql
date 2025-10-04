-- Fix: Update exchange_device_code to use base64 token hashing (matching validate_and_touch_token)
-- Issue: exchange_device_code was using hex encoding, validate_and_touch_token uses base64
-- Result: Token mismatch causing 401 errors

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

  -- Hash token with SHA-256 and encode as base64 (matching validate_and_touch_token)
  token_hash := encode(digest(raw_token, 'sha256'), 'base64');

  INSERT INTO public.device_tokens (
    token_hash,
    device_id,
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
    reg.user_id,
    reg.user_email,
    input_device_name,
    now(),
    p_expires_at,
    now(),
    now(),
    now()
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION public.exchange_device_code(text, text, text, text, timestamptz) IS
  'Exchange device pairing code for token. Uses base64 SHA-256 hashing to match validate_and_touch_token.';
