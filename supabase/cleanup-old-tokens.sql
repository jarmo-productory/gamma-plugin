-- Clean up old device tokens with wrong hash format
-- Run this in Supabase SQL Editor after deploying the exchange_device_code fix
-- This removes tokens created with hex hashing (old format)
-- New tokens will use base64 hashing (matching validate_and_touch_token)

DELETE FROM device_tokens
WHERE user_email = 'jarmo@productory.eu';

-- Verify cleanup
SELECT
  COUNT(*) as remaining_tokens,
  user_email
FROM device_tokens
GROUP BY user_email;
