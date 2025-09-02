-- Allow anon to execute validate_and_touch_token for device-token authentication
-- Rationale: Device token is the credential; function is SECURITY DEFINER and returns minimal data.
GRANT EXECUTE ON FUNCTION validate_and_touch_token(TEXT) TO anon;

