GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_gestor(uuid, uuid) TO authenticated;