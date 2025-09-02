-- Migration: Add missing user fields for Sprint 20 Account Management
-- Date: 2025-08-31

-- Add auth_id column for Supabase Auth integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id TEXT;

-- Add name column for user profiles  
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add notification preference columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_notifications BOOLEAN DEFAULT false;

-- Create index on auth_id for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Update existing users to have default notification preferences
UPDATE users 
SET email_notifications = true, marketing_notifications = false 
WHERE email_notifications IS NULL OR marketing_notifications IS NULL;