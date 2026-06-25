
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- RLS: leitura para membros do projeto; escrita para gestores/super admins
CREATE POLICY "Logos: ver membros"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'projeto-logos'
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_projeto_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "Logos: gerir gestores"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'projeto-logos'
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_projeto_gestor(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
  WITH CHECK (
    bucket_id = 'projeto-logos'
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_projeto_gestor(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
