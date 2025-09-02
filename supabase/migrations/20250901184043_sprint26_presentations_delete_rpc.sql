-- Sprint 26 (stretch): Delete presentation via device-token RPC

CREATE OR REPLACE FUNCTION public.rpc_delete_presentation(
  p_user_id uuid,
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.presentations
  WHERE id = p_id AND user_id = p_user_id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  IF _deleted > 0 THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_delete_presentation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_delete_presentation(uuid, uuid) TO anon, authenticated;

