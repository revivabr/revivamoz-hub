-- =============================================================================
-- Storage buckets — Reviva Moz
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('comprovantes',  'comprovantes',  false),
  ('projeto-logos', 'projeto-logos', true),
  ('backups',       'backups',       false)
ON CONFLICT (id) DO NOTHING;

-- ----- comprovantes (privado, scoped por projeto) -----
CREATE POLICY "Membros leem comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id='comprovantes'
    AND public.is_projeto_member(auth.uid(), (split_part(name,'/',1))::uuid)
  );
CREATE POLICY "Gestores escrevem comprovantes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id='comprovantes'
    AND public.is_projeto_gestor(auth.uid(), (split_part(name,'/',1))::uuid)
  );
CREATE POLICY "Gestores atualizam comprovantes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id='comprovantes'
    AND public.is_projeto_gestor(auth.uid(), (split_part(name,'/',1))::uuid)
  );
CREATE POLICY "Gestores apagam comprovantes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id='comprovantes'
    AND public.is_projeto_gestor(auth.uid(), (split_part(name,'/',1))::uuid)
  );

-- ----- projeto-logos (público para leitura) -----
CREATE POLICY "Logos públicos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id='projeto-logos');
CREATE POLICY "Gestores gerem logos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id='projeto-logos' AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.is_projeto_gestor(auth.uid(), (split_part(name,'/',1))::uuid)
    )
  )
  WITH CHECK (
    bucket_id='projeto-logos' AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.is_projeto_gestor(auth.uid(), (split_part(name,'/',1))::uuid)
    )
  );

-- ----- backups (só super admin) -----
CREATE POLICY "Super admins leem backups" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='backups' AND public.has_role(auth.uid(),'super_admin'));
