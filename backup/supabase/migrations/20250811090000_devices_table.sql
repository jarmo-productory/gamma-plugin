-- Devices table for extension pairing tokens
create table if not exists public.devices (
  device_id text primary key,
  code_hash text unique,
  code_expires_at timestamptz,
  user_id text,
  created_at timestamptz default now(),
  linked_at timestamptz
);

alter table public.devices enable row level security;

-- RLS: users can only view devices that belong to them
create policy "Users view own devices" on public.devices
  for select using (user_id = auth.uid()::text);

-- Only service role should insert/update; we avoid exposing to anon
-- (Netlify functions use service role key)

