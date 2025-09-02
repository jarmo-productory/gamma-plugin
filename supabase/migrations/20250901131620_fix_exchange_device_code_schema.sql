-- Fix exchange_device_code RPC to match actual device_tokens schema
-- The table has "token" column, not "token_hash" column

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

  -- Hash the token
  token_hash := encode(digest(raw_token, 'sha256'), 'hex');

  -- Insert token row with correct column name (token, not token_hash)
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