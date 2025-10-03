-- Debug device pairing issue
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check device_registrations (pairing codes)
SELECT
  'device_registrations' as table_name,
  device_id,
  code,
  linked,
  user_id,
  user_email,
  expires_at,
  created_at
FROM device_registrations
WHERE user_email = 'jarmo@productory.eu'
ORDER BY created_at DESC
LIMIT 3;

-- 2. Check device_tokens (actual tokens)
SELECT
  'device_tokens' as table_name,
  device_id,
  user_id,
  user_email,
  device_name,
  expires_at,
  last_used,
  length(token_hash) as token_hash_length,
  created_at
FROM device_tokens
WHERE user_email = 'jarmo@productory.eu'
ORDER BY created_at DESC
LIMIT 3;

-- 3. Test get_user_devices RPC with your auth UUID
-- Replace 'YOUR_AUTH_UUID' with actual UUID from auth.users
SELECT * FROM get_user_devices('YOUR_AUTH_UUID_HERE');

-- 4. Check what user_id format is in device_tokens
SELECT
  user_id,
  user_email,
  device_id,
  CASE
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
    ELSE 'Not UUID format'
  END as user_id_format
FROM device_tokens
WHERE user_email = 'jarmo@productory.eu';
