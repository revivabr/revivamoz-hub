-- 1) Fecha a escalada de privilégios: gestores não podem criar/alterar outros gestores
DROP POLICY IF EXISTS "Membros: gerir (super admin ou gestor do projeto)" ON public.projeto_membros;

CREATE POLICY "Membros: super admin gere tudo"
ON public.projeto_membros
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Membros: gestor adiciona nao-gestores"
ON public.projeto_membros
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_projeto_gestor(auth.uid(), projeto_id)
  AND papel <> 'gestor'::projeto_papel
);

CREATE POLICY "Membros: gestor atualiza nao-gestores"
ON public.projeto_membros
FOR UPDATE
TO authenticated
USING (
  public.is_projeto_gestor(auth.uid(), projeto_id)
  AND papel <> 'gestor'::projeto_papel
)
WITH CHECK (
  public.is_projeto_gestor(auth.uid(), projeto_id)
  AND papel <> 'gestor'::projeto_papel
);

CREATE POLICY "Membros: gestor remove nao-gestores"
ON public.projeto_membros
FOR DELETE
TO authenticated
USING (
  public.is_projeto_gestor(auth.uid(), projeto_id)
  AND papel <> 'gestor'::projeto_papel
);

-- 2) Reafirma o fecho das funções SECURITY DEFINER
REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_assistente_conversas() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_projeto_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_projeto_gestor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_projeto_convite(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_super_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_super_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_super_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ai_provedores_publico() FROM PUBLIC, anon;

-- 3) Único ponto público: relatório partilhado por token (valida token, revogação e expiração)
REVOKE ALL ON FUNCTION public.get_relatorio_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_relatorio_publico(text) TO anon, authenticated;
