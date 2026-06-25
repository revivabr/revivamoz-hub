
-- Path convention: <projeto_id>/<filename>
CREATE POLICY "Membros veem comprovantes do projeto" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'comprovantes' AND (
      public.is_projeto_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Gestores enviam comprovantes" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'comprovantes' AND (
      public.is_projeto_gestor(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Gestores atualizam comprovantes" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'comprovantes' AND (
      public.is_projeto_gestor(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Gestores apagam comprovantes" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'comprovantes' AND (
      public.is_projeto_gestor(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
