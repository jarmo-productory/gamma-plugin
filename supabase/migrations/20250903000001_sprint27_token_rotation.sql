-- Migration: Token Rotation System for Sprint 27
-- Auth & Integrations Hardening - Phase 2
-- 
-- SECURITY FEATURES:
-- 1. Enable extension token refresh without web session dependency
-- 2. Implement secure token rotation with existing device identity preservation
-- 3. Maintain RLS compliance and least privilege access

-- Step 1: Create secure token rotation RPC
CREATE OR REPLACE FUNCTION rotate_device_token(input_token TEXT)
RETURNS TABLE(
  token TEXT,
  expires_at TIMESTAMPTZ,
  device_id TEXT,
  user_id TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  token_hash_input TEXT;
  token_record RECORD;
  new_token TEXT;
  new_token_hash TEXT;
  new_expiry TIMESTAMPTZ;
BEGIN
  -- Input validation
  IF input_token IS NULL OR length(input_token) < 32 THEN
    RAISE EXCEPTION 'Invalid token format';
  END IF;

  -- Hash the input token using SHA-256
  token_hash_input := encode(digest(input_token, 'sha256'), 'base64');
  
  -- Find valid token record and get device/user info
  SELECT dt.user_id, dt.device_id, dt.device_name, dt.user_email
  INTO token_record
  FROM device_tokens dt
  WHERE dt.token_hash = token_hash_input
    AND dt.expires_at > NOW()
  LIMIT 1;
  
  -- If no valid token found, raise exception for 401 response
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_INVALID';
  END IF;
  
  -- Generate new secure token (32 bytes = 256 bits of entropy)
  new_token := encode(gen_random_bytes(32), 'base64');
  new_token := replace(replace(replace(new_token, '+', '-'), '/', '_'), '=', '');
  
  -- Hash the new token
  new_token_hash := encode(digest(new_token, 'sha256'), 'base64');
  
  -- Set new expiry (24 hours from now)
  new_expiry := NOW() + INTERVAL '24 hours';
  
  -- Atomic operation: expire old token and insert new token
  BEGIN
    -- Expire the old token immediately
    UPDATE device_tokens 
    SET expires_at = NOW(), updated_at = NOW()
    WHERE token_hash = token_hash_input;
    
    -- Insert new token with same device identity
    INSERT INTO device_tokens (
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
      new_token_hash,
      token_record.device_id,
      token_record.user_id,
      token_record.user_email,
      token_record.device_name,
      NOW(),
      new_expiry,
      NOW(),
      NOW(),
      NOW()
    );
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Token collision during rotation - retry';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Token rotation failed: %', SQLERRM;
  END;
  
  -- Return new token info for the API response
  token := new_token;
  expires_at := new_expiry;
  device_id := token_record.device_id;
  user_id := token_record.user_id;
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission only to authenticated and service roles
GRANT EXECUTE ON FUNCTION rotate_device_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_device_token(TEXT) TO service_role;

-- Add security comment
COMMENT ON FUNCTION rotate_device_token(TEXT) IS 'Sprint 27: Rotate device token securely. Validates existing token, generates new token, expires old token atomically. Enables extension refresh without web session.';

-- Migration complete - ready for Phase 2 implementation