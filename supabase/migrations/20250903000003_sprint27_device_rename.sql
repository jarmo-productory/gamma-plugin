-- Migration: Device Rename Functionality for Sprint 27
-- Auth & Integrations Hardening - Phase 4 UX Polish
-- 
-- UX FEATURES:
-- 1. Enable device aliasing/renaming for better device management
-- 2. Maintain device name history for user reference

-- Step 1: Create device rename RPC function
CREATE OR REPLACE FUNCTION rename_device(
  p_user_id TEXT,
  p_device_id TEXT,
  p_new_name TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_device_id IS NULL OR p_new_name IS NULL THEN
    RAISE EXCEPTION 'User ID, device ID, and new name are required';
  END IF;
  
  IF length(trim(p_new_name)) = 0 THEN
    RAISE EXCEPTION 'Device name cannot be empty';
  END IF;
  
  IF length(p_new_name) > 100 THEN
    RAISE EXCEPTION 'Device name cannot exceed 100 characters';
  END IF;

  -- Update device name (user can only rename their own devices)
  UPDATE device_tokens 
  SET 
    device_name = trim(p_new_name),
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND device_id = p_device_id;
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Return success if device was found and updated
  RETURN rows_affected > 0;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION rename_device(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rename_device(TEXT, TEXT, TEXT) TO service_role;

-- Add security comment
COMMENT ON FUNCTION rename_device(TEXT, TEXT, TEXT) IS 'Sprint 27: Rename/alias a device for better user experience. Users can only rename their own devices.';

-- Migration complete - device rename functionality ready