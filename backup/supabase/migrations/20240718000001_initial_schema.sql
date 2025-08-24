-- Initial schema for Gamma Timetable Extension
-- Users table (managed by Clerk, replicated locally)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Presentations table (atomic storage matching current system)
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  gamma_url VARCHAR UNIQUE NOT NULL, -- Original Gamma presentation URL (unique identifier)
  start_time VARCHAR DEFAULT '09:00', -- Default start time
  total_duration INTEGER DEFAULT 0, -- Total duration in minutes
  timetable_data JSONB NOT NULL, -- Complete timetable object with items array
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_presentations_user_id ON presentations(user_id);
CREATE INDEX idx_presentations_gamma_url ON presentations(gamma_url);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = clerk_id);

-- RLS Policies for presentations table
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.uid()::text
  )); 