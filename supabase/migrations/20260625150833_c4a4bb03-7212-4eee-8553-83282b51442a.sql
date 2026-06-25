
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_projeto_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_projeto_gestor(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- super_admin_seed: garantir RLS + política mínima (apenas super admins)
ALTER TABLE public.super_admin_seed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins gerem seeds" ON public.super_admin_seed;
CREATE POLICY "Super admins gerem seeds" ON public.super_admin_seed
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
