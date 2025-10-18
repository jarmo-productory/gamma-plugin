-- Enable pgcrypto extension for digest() function
-- Required by exchange_device_code() for token hashing
-- Error: "function digest(text, unknown) does not exist"

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS
  'Cryptographic functions including digest() used for token hashing in device authentication';
