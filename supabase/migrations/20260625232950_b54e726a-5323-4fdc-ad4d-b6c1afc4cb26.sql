
-- Revoke broad EXECUTE on all public functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Public portal RPC (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_relatorio_publico(text) TO anon, authenticated;

-- Authenticated-only RPCs called from the app UI
GRANT EXECUTE ON FUNCTION public.accept_projeto_convite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_super_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_super_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_provedores_publico() TO authenticated;

-- service_role keeps full access
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
