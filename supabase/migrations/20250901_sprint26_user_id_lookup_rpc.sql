-- Sprint 26: helper RPC to map auth_id -> app users.id

CREATE OR REPLACE FUNCTION public.rpc_get_user_id_by_auth_id(
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = p_auth_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_user_id_by_auth_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_user_id_by_auth_id(uuid) TO anon, authenticated;

