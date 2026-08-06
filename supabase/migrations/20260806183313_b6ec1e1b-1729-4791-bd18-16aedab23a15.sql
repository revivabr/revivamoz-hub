-- 1) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_assistente_conversas() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_projeto_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_projeto_gestor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_projeto_convite(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_super_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_super_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_super_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ai_provedores_publico() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_gestor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_projeto_convite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_super_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_super_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_provedores_publico() TO authenticated;

-- Public donor portal: token-validated read stays reachable without login
REVOKE ALL ON FUNCTION public.get_relatorio_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_relatorio_publico(text) TO anon, authenticated;

-- 2) categorias admin policy must target authenticated only
DROP POLICY IF EXISTS "Super admins gerem categorias" ON public.categorias;
CREATE POLICY "Super admins gerem categorias"
ON public.categorias
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));