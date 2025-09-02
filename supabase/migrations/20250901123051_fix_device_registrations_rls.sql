-- Fix RLS policies for device_registrations to allow anonymous inserts
-- Drop and recreate the policy to ensure it's correct

DROP POLICY IF EXISTS device_registrations_anon_insert ON public.device_registrations;

-- Allow anonymous inserts for initial registration (code + device + expiry)
CREATE POLICY device_registrations_anon_insert ON public.device_registrations
  FOR INSERT TO anon
  WITH CHECK (
    code IS NOT NULL AND 
    device_id IS NOT NULL AND 
    expires_at > NOW()
  );