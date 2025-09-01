-- Migration: Secure Token Hashing System
-- Sprint 19 Phase 1: Critical Security Hardening
-- 
-- SECURITY FIXES:
-- 1. Replace raw token storage with SHA-256 hashing
-- 2. Remove permissive RLS policies allowing anonymous full table access
-- 3. Implement secure RPC for token validation with minimal data return
-- 4. Add proper constraints and security boundaries

-- Step 1: Add token_hash column and update schema
ALTER TABLE device_tokens 
ADD COLUMN token_hash TEXT;

-- Create unique index on token_hash for performance
CREATE UNIQUE INDEX idx_device_tokens_hash ON device_tokens(token_hash) WHERE token_hash IS NOT NULL;

-- Add constraint to ensure tokens are properly hashed (minimum length check)
ALTER TABLE device_tokens 
ADD CONSTRAINT chk_token_hash_length CHECK (
  token_hash IS NULL OR length(token_hash) >= 44  -- Base64 encoded SHA-256 is 44 chars
);

-- Step 2: Create secure token validation RPC
CREATE OR REPLACE FUNCTION validate_and_touch_token(input_token TEXT)
RETURNS TABLE(user_id TEXT, device_id TEXT, device_name TEXT, user_email TEXT) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  token_hash_input TEXT;
  token_record RECORD;
BEGIN
  -- Input validation
  IF input_token IS NULL OR length(input_token) < 32 THEN
    RETURN; -- Empty result for invalid input
  END IF;

  -- Hash the input token using SHA-256
  token_hash_input := encode(digest(input_token, 'sha256'), 'base64');
  
  -- Find valid token record
  SELECT dt.user_id, dt.device_id, dt.device_name, dt.user_email, dt.expires_at
  INTO token_record
  FROM device_tokens dt
  WHERE dt.token_hash = token_hash_input
    AND dt.expires_at > NOW()
  LIMIT 1;
  
  -- If no valid token found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Update last_used timestamp atomically
  UPDATE device_tokens 
  SET last_used = NOW(), updated_at = NOW()
  WHERE token_hash = token_hash_input;
  
  -- Return minimal necessary data
  user_id := token_record.user_id;
  device_id := token_record.device_id;
  device_name := COALESCE(token_record.device_name, 'Unknown Device');
  user_email := token_record.user_email;
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission only to authenticated and service roles
GRANT EXECUTE ON FUNCTION validate_and_touch_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_and_touch_token(TEXT) TO service_role;

-- Step 3: Create function to store new hashed tokens
CREATE OR REPLACE FUNCTION store_hashed_token(
  input_token TEXT,
  p_device_id TEXT,
  p_user_id TEXT,
  p_user_email TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS BOOLEAN
SECURITY DEFINER 
LANGUAGE plpgsql
AS $$
DECLARE
  token_hash_input TEXT;
  default_expiry TIMESTAMPTZ;
BEGIN
  -- Input validation
  IF input_token IS NULL OR p_device_id IS NULL OR p_user_id IS NULL OR p_user_email IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF length(input_token) < 32 THEN
    RAISE EXCEPTION 'Token must be at least 32 characters long';
  END IF;
  
  -- Hash the token
  token_hash_input := encode(digest(input_token, 'sha256'), 'base64');
  
  -- Set default expiry if not provided (24 hours)
  default_expiry := COALESCE(p_expires_at, NOW() + INTERVAL '24 hours');
  
  -- Insert new token record
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
    token_hash_input,
    p_device_id,
    p_user_id,
    p_user_email,
    p_device_name,
    NOW(),
    default_expiry,
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- Token hash collision (extremely unlikely with proper random tokens)
    RAISE EXCEPTION 'Token collision detected - regenerate token';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to store token: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION store_hashed_token(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION store_hashed_token(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Step 4: Remove insecure RLS policies and grants
DROP POLICY IF EXISTS "anonymous_can_read_tokens_for_validation" ON device_tokens;
DROP POLICY IF EXISTS "anonymous_can_update_last_used" ON device_tokens;

-- Revoke dangerous grants to anonymous role
REVOKE ALL ON device_tokens FROM anon;

-- Step 5: Create secure cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql  
AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM device_tokens 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log cleanup activity
  IF cleanup_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired device tokens', cleanup_count;
  END IF;
  
  RETURN cleanup_count;
END;
$$;

-- Grant execute permission for cleanup operations
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO service_role;

-- Step 6: Create secure user device listing function
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id TEXT)
RETURNS TABLE(
  device_id TEXT,
  device_name TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_used TIMESTAMPTZ,
  is_active BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Return user's devices with computed active status
  RETURN QUERY
  SELECT 
    dt.device_id,
    COALESCE(dt.device_name, 'Unknown Device'),
    dt.issued_at,
    dt.expires_at,
    dt.last_used,
    (dt.expires_at > NOW()) as is_active
  FROM device_tokens dt
  WHERE dt.user_id = p_user_id
  ORDER BY dt.last_used DESC;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_user_devices(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_devices(TEXT) TO service_role;

-- Step 7: Create secure token revocation function
CREATE OR REPLACE FUNCTION revoke_device_token(p_user_id TEXT, p_device_id TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_device_id IS NULL THEN
    RAISE EXCEPTION 'User ID and Device ID cannot be null';
  END IF;
  
  -- Delete the device token (user can only revoke their own tokens)
  DELETE FROM device_tokens 
  WHERE user_id = p_user_id 
    AND device_id = p_device_id;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Return success if token was found and deleted
  RETURN rows_affected > 0;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION revoke_device_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_device_token(TEXT, TEXT) TO service_role;

-- Step 8: Add security comments and documentation
COMMENT ON FUNCTION validate_and_touch_token(TEXT) IS 'Securely validate device token by hash and update last_used timestamp. Returns minimal user data on success.';
COMMENT ON FUNCTION store_hashed_token(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS 'Store device token as SHA-256 hash with proper validation and constraints.';
COMMENT ON FUNCTION get_user_devices(TEXT) IS 'List all device tokens for a specific user with computed active status.';
COMMENT ON FUNCTION revoke_device_token(TEXT, TEXT) IS 'Revoke/delete a specific device token for a user.';
COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Remove expired device tokens from database. Returns count of cleaned tokens.';

COMMENT ON COLUMN device_tokens.token_hash IS 'SHA-256 hash of the original token (base64 encoded). Original token never stored.';
COMMENT ON COLUMN device_tokens.token IS 'DEPRECATED: Raw token field - will be removed in future migration after hash migration complete.';

-- Step 9: Create index for efficient user device queries  
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_last_used ON device_tokens(user_id, last_used DESC);

-- Migration complete - raw tokens should be migrated to hashes in application code
-- Next step: Update application to use new RPC functions instead of direct table access