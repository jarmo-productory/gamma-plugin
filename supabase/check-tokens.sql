-- Check device_tokens table for your user
SELECT
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
LIMIT 5;

-- Test the get_user_devices RPC with your actual auth UUID
SELECT * FROM get_user_devices('9c726b21-0292-4539-a294-558450fc67b9');
