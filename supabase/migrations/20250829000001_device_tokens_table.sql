-- Sprint 16: Device Tokens Table for Persistent Authentication
-- Replaces in-memory token storage with database persistence

-- Device tokens table for persistent device authentication
CREATE TABLE IF NOT EXISTS public.device_tokens (
  token TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_id TEXT NOT NULL, 
  user_email TEXT NOT NULL,
  device_name TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON device_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_expires_at ON device_tokens(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own device tokens
CREATE POLICY "Users can view own device tokens" 
  ON device_tokens FOR SELECT 
  USING (user_id = auth.uid()::text);

-- RLS Policy: Users can insert their own device tokens (for API routes)
CREATE POLICY "Users can insert own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- RLS Policy: Users can update their own device tokens (for last_used updates)
CREATE POLICY "Users can update own device tokens" 
  ON device_tokens FOR UPDATE
  USING (user_id = auth.uid()::text);

-- RLS Policy: Users can delete their own device tokens (for revocation)
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (user_id = auth.uid()::text);

-- Function to automatically cleanup expired tokens (runs on token validation)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM device_tokens 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();