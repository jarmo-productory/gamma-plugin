-- Add name column to users table if it doesn't exist
-- This ensures the users table has the name field for profile management

-- Add name column with default null value
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.name IS 'User display name for profile personalization';

-- Add index for name searches (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name) WHERE name IS NOT NULL;