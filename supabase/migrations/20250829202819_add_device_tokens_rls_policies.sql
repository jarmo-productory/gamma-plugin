-- Migration: Add RLS policies for device_tokens table
-- This completes Sprint 16 Phase 2: Database-Based Token Storage
-- 
-- Problem: device_tokens table exists but RLS policies prevent:
-- 1. Token storage during device linking (authenticated users)
-- 2. Token validation during API calls (anonymous/unauthenticated)
--
-- Solution: Add policies to allow both use cases

-- First, ensure RLS is enabled on device_tokens table
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert device tokens for themselves
-- This enables token storage during device linking when user is signed in
CREATE POLICY "authenticated_users_can_insert_own_tokens" ON device_tokens
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Policy 2: Allow authenticated users to view their own device tokens
-- This enables the /settings/integrations page to show connected devices
CREATE POLICY "authenticated_users_can_view_own_tokens" ON device_tokens
  FOR SELECT 
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policy 3: Allow authenticated users to update their own device tokens
-- This enables updating last_used timestamp during token validation
CREATE POLICY "authenticated_users_can_update_own_tokens" ON device_tokens
  FOR UPDATE 
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policy 4: Allow authenticated users to delete their own device tokens
-- This enables token revocation from the settings page
CREATE POLICY "authenticated_users_can_delete_own_tokens" ON device_tokens
  FOR DELETE 
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policy 5: Allow anonymous role to read tokens for validation
-- This is CRITICAL for device token validation in API routes
-- The API routes need to validate tokens without user authentication
CREATE POLICY "anonymous_can_read_tokens_for_validation" ON device_tokens
  FOR SELECT 
  TO anon
  USING (true);

-- Policy 6: Allow anonymous role to update last_used during validation
-- This enables updating the last_used timestamp when validating tokens
CREATE POLICY "anonymous_can_update_last_used" ON device_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE device_tokens IS 'Device authentication tokens with RLS policies for secure storage and validation';

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_expires_at ON device_tokens(expires_at);

-- Grant necessary permissions to anon role for token validation
GRANT SELECT ON device_tokens TO anon;
GRANT UPDATE ON device_tokens TO anon;