-- Adjust RPC grants to support device-token validation without RLS bypass

-- Allow anon role to execute validate_and_touch_token since the function
-- performs its own security checks (token hashing + expiry) and returns
-- minimal non-sensitive data.
GRANT EXECUTE ON FUNCTION validate_and_touch_token(TEXT) TO anon;

