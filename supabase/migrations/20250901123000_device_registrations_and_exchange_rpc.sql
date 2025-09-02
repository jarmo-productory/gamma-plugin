-- Device registrations table to support service-role-free pairing exchange
create table if not exists public.device_registrations (
  code text primary key,
  device_id text not null,
  user_id uuid,
  user_email text,
  linked boolean not null default false,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  expires_at timestamptz not null
);

alter table public.device_registrations enable row level security;

-- Allow anonymous inserts for initial registration (code + device + expiry)
create policy device_registrations_anon_insert on public.device_registrations
  for insert to anon
  with check (
    code is not null and device_id is not null and expires_at > now()
  );

-- Allow authenticated users to link (set linked true and own user info)
create policy device_registrations_auth_update_link on public.device_registrations
  for update to authenticated
  using (
    code is not null and expires_at > now()
  )
  with check (
    linked = true and user_id = auth.uid()
  );

-- Optional: allow select for debugging by authenticated users (limited)
create policy device_registrations_auth_select on public.device_registrations
  for select to authenticated
  using (user_id = auth.uid());

-- Exchange RPC: validates registration and writes hashed token without service role
create or replace function public.exchange_device_code(
  input_code text,
  input_device_id text,
  input_device_name text,
  raw_token text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
as $$
declare
  reg record;
  token_hash text;
begin
  -- Validate registration exists, linked, not expired, and device matches
  select * into reg
  from public.device_registrations r
  where r.code = input_code
    and r.device_id = input_device_id
    and r.linked = true
    and r.expires_at > now()
  limit 1;

  if not found then
    return false;
  end if;

  -- Hash the token
  token_hash := encode(digest(raw_token, 'sha256'), 'hex');

  -- Insert token row (device_tokens schema must exist)
  insert into public.device_tokens (
    device_id, user_id, user_email, device_name,
    token_hash, issued_at, expires_at, last_used
  ) values (
    input_device_id, reg.user_id, reg.user_email, input_device_name,
    token_hash, now(), p_expires_at, now()
  );

  return true;
end;
$$;

-- Ensure required extension is available for digest()
create extension if not exists pgcrypto;

grant execute on function public.exchange_device_code(text, text, text, text, timestamptz) to anon, authenticated;

comment on function public.exchange_device_code(text, text, text, text, timestamptz)
  is 'Service-role-free exchange: validates device registration and stores hashed token. Returns true on success.';

