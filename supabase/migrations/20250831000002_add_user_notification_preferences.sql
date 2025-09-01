-- Add notification preferences columns to users table
-- This migration adds email and marketing notification preferences for Sprint-20

-- Add notification preference columns with defaults
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS marketing_notifications BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.email_notifications IS 'User preference for receiving important account and presentation notifications via email';
COMMENT ON COLUMN users.marketing_notifications IS 'User preference for receiving marketing communications and product updates';

-- Update existing users to have the default notification settings
UPDATE users 
SET 
  email_notifications = true,
  marketing_notifications = false 
WHERE 
  email_notifications IS NULL 
  OR marketing_notifications IS NULL;