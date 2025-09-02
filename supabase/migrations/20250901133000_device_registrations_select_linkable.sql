-- Allow authenticated users to SELECT linkable registrations (linked=false, not expired)
-- This enables the web dashboard to read a pending code to show pairing UI.
DROP POLICY IF EXISTS device_registrations_auth_select_linkable ON public.device_registrations;

CREATE POLICY device_registrations_auth_select_linkable
  ON public.device_registrations
  FOR SELECT TO authenticated
  USING (linked = false AND expires_at > now());

