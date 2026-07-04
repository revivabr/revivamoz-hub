
-- Only super_admin manages categorias now
DROP POLICY IF EXISTS "Gestores e super admins gerem categorias do projeto" ON public.categorias;

CREATE POLICY "Super admins gerem categorias"
ON public.categorias
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add global "Não sei" categories (visible in all projects)
INSERT INTO public.categorias (projeto_id, tipo, nome)
SELECT NULL, 'entrada'::lancamento_tipo, 'Não sei'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias WHERE projeto_id IS NULL AND tipo='entrada' AND nome='Não sei'
);

INSERT INTO public.categorias (projeto_id, tipo, nome)
SELECT NULL, 'saida'::lancamento_tipo, 'Não sei'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias WHERE projeto_id IS NULL AND tipo='saida' AND nome='Não sei'
);
