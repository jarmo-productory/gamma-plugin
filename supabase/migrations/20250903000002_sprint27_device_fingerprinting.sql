-- Migration: Device Fingerprinting System for Sprint 27
-- Auth & Integrations Hardening - Phase 3
-- 
-- DEVICE IDENTITY FEATURES:
-- 1. Add stable device fingerprinting to prevent duplicate device creation
-- 2. Enable device identity persistence across logins
-- 3. Implement device upsert functionality with fingerprint uniqueness

-- Step 1: Add device_fingerprint column to device_tokens table
ALTER TABLE device_tokens 
ADD COLUMN device_fingerprint TEXT;

-- Step 2: Add device_fingerprint column to device_registrations table
ALTER TABLE device_registrations 
ADD COLUMN device_fingerprint TEXT;

-- Step 3: Create unique index on (user_id, device_fingerprint) for device_tokens
-- This prevents duplicate devices for the same user and browser installation
CREATE UNIQUE INDEX idx_device_tokens_user_fingerprint 
ON device_tokens(user_id, device_fingerprint) 
WHERE device_fingerprint IS NOT NULL;

-- Step 4: Add constraint to ensure device_fingerprint format (SHA-256 hash)
ALTER TABLE device_tokens 
ADD CONSTRAINT chk_device_fingerprint_format CHECK (
  device_fingerprint IS NULL OR (
    length(device_fingerprint) = 64 AND  -- SHA-256 hex is 64 chars
    device_fingerprint ~ '^[0-9a-f]+$'   -- Only lowercase hex characters
  )
);

ALTER TABLE device_registrations 
ADD CONSTRAINT chk_device_reg_fingerprint_format CHECK (
  device_fingerprint IS NULL OR (
    length(device_fingerprint) = 64 AND
    device_fingerprint ~ '^[0-9a-f]+$'
  )
);

-- Step 5: Create upsert function for device by fingerprint
CREATE OR REPLACE FUNCTION upsert_device_by_fingerprint(
  p_device_fingerprint TEXT,
  p_client JSONB
) RETURNS TABLE(
  device_id TEXT,
  token TEXT,
  expires_at TIMESTAMPTZ,
  is_new_device BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id TEXT;
  v_user_email TEXT;
  v_device_name TEXT;
  v_existing_device_id TEXT;
  v_new_token TEXT;
  v_new_token_hash TEXT;
  v_new_expiry TIMESTAMPTZ;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- Input validation
  IF p_device_fingerprint IS NULL OR p_client IS NULL THEN
    RAISE EXCEPTION 'Device fingerprint and client data are required';
  END IF;
  
  IF length(p_device_fingerprint) != 64 OR p_device_fingerprint !~ '^[0-9a-f]+$' THEN
    RAISE EXCEPTION 'Invalid device fingerprint format';
  END IF;

  -- Extract client information
  v_user_id := p_client->>'user_id';
  v_user_email := p_client->>'user_email';
  v_device_name := p_client->>'device_name';
  
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'User ID and email are required in client data';
  END IF;

  -- Set default expiry (24 hours from now)
  v_new_expiry := NOW() + INTERVAL '24 hours';

  -- Generate new secure token (32 bytes = 256 bits of entropy)
  v_new_token := encode(gen_random_bytes(32), 'base64');
  v_new_token := replace(replace(replace(v_new_token, '+', '-'), '/', '_'), '=', '');
  
  -- Hash the new token
  v_new_token_hash := encode(digest(v_new_token, 'sha256'), 'base64');

  -- Check if device already exists for this user and fingerprint
  SELECT dt.device_id INTO v_existing_device_id
  FROM device_tokens dt
  WHERE dt.user_id = v_user_id 
    AND dt.device_fingerprint = p_device_fingerprint
    AND dt.expires_at > NOW()  -- Only consider active tokens
  LIMIT 1;

  IF v_existing_device_id IS NOT NULL THEN
    -- Device exists: expire old token and create new one with same device_id
    
    -- Expire existing tokens for this device
    UPDATE device_tokens 
    SET expires_at = NOW(), updated_at = NOW()
    WHERE user_id = v_user_id 
      AND device_fingerprint = p_device_fingerprint;
    
    -- Insert new token with existing device_id
    INSERT INTO device_tokens (
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
      v_new_token_hash,
      v_existing_device_id,
      p_device_fingerprint,
      v_user_id,
      v_user_email,
      v_device_name,
      NOW(),
      v_new_expiry,
      NOW(),
      NOW(),
      NOW()
    );
    
    device_id := v_existing_device_id;
    v_is_new := FALSE;
    
  ELSE
    -- New device: generate new device_id and create token
    v_existing_device_id := 'dev_' || encode(gen_random_bytes(16), 'hex');
    
    INSERT INTO device_tokens (
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
      v_new_token_hash,
      v_existing_device_id,
      p_device_fingerprint,
      v_user_id,
      v_user_email,
      v_device_name,
      NOW(),
      v_new_expiry,
      NOW(),
      NOW(),
      NOW()
    );
    
    device_id := v_existing_device_id;
    v_is_new := TRUE;
  END IF;

  -- Return the result
  token := v_new_token;
  expires_at := v_new_expiry;
  is_new_device := v_is_new;
  
  RETURN NEXT;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Device fingerprint conflict - retry with new fingerprint';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Device upsert failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION upsert_device_by_fingerprint(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_device_by_fingerprint(TEXT, JSONB) TO service_role;

-- Step 6: Add security comments
COMMENT ON FUNCTION upsert_device_by_fingerprint(TEXT, JSONB) IS 'Sprint 27: Upsert device token by fingerprint. Creates new device or rotates token for existing device. Prevents duplicate device creation.';
COMMENT ON COLUMN device_tokens.device_fingerprint IS 'SHA-256 hash of stable device identifier (installId + userAgent). Used to prevent duplicate devices.';
COMMENT ON COLUMN device_registrations.device_fingerprint IS 'Device fingerprint for pairing flow. Links registration to stable device identity.';

-- Step 7: Update exchange_device_code to handle device fingerprinting
CREATE OR REPLACE FUNCTION exchange_device_code(
  input_code TEXT,
  input_device_id TEXT,
  input_device_name TEXT,
  raw_token TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg RECORD;
  v_client JSONB;
BEGIN
  -- Validate registration exists, linked, not expired, and device matches
  SELECT * INTO reg
  FROM device_registrations r
  WHERE r.code = input_code
    AND r.device_id = input_device_id
    AND r.linked = true
    AND r.expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Build client data for upsert function
  v_client := jsonb_build_object(
    'user_id', reg.user_id,
    'user_email', reg.user_email,
    'device_name', input_device_name
  );

  -- If fingerprint is available, use upsert function for device deduplication
  IF reg.device_fingerprint IS NOT NULL THEN
    -- Use fingerprint-based upsert to prevent duplicates
    PERFORM upsert_device_by_fingerprint(reg.device_fingerprint, v_client);
    RETURN TRUE;
  ELSE
    -- Fallback: Use legacy token storage for registrations without fingerprint
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
      encode(digest(raw_token, 'sha256'), 'base64'),
      input_device_id,
      reg.user_id,
      reg.user_email,
      input_device_name,
      NOW(),
      p_expires_at,
      NOW(),
      NOW(),
      NOW()
    );
    RETURN TRUE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Exchange failed: %', SQLERRM;
END;
$$;

-- Migration complete - ready for device fingerprinting implementation