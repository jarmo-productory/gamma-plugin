-- Revoke anon execute on validate_and_touch_token to align with Sprint 22
REVOKE EXECUTE ON FUNCTION validate_and_touch_token(TEXT) FROM anon;

