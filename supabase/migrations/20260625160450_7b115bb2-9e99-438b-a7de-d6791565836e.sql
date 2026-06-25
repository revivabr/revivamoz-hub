
CREATE TABLE public.relatorio_partilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_partilhas TO authenticated;
GRANT ALL ON public.relatorio_partilhas TO service_role;

ALTER TABLE public.relatorio_partilhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view shares of own projects" ON public.relatorio_partilhas
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_projeto_member(auth.uid(), projeto_id)
  );

CREATE POLICY "manage shares as gestor/super" ON public.relatorio_partilhas
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_projeto_gestor(auth.uid(), projeto_id)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_projeto_gestor(auth.uid(), projeto_id)
  );

CREATE TRIGGER trg_relatorio_partilhas_updated
  BEFORE UPDATE ON public.relatorio_partilhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_relatorio_publico(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share RECORD;
  _projeto JSONB;
  _lancamentos JSONB;
  _kpis JSONB;
BEGIN
  SELECT * INTO _share
  FROM public.relatorio_partilhas
  WHERE token = _token AND NOT revoked AND expires_at > now()
  LIMIT 1;

  IF _share IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(p) - 'created_by' INTO _projeto
  FROM public.projetos p WHERE id = _share.projeto_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id, 'data', l.data, 'tipo', l.tipo, 'valor', l.valor,
    'descricao', l.descricao,
    'categoria', c.nome
  ) ORDER BY l.data DESC), '[]'::jsonb)
  INTO _lancamentos
  FROM public.lancamentos l
  LEFT JOIN public.categorias c ON c.id = l.categoria_id
  WHERE l.projeto_id = _share.projeto_id
    AND l.data BETWEEN _share.data_inicio AND _share.data_fim;

  SELECT jsonb_build_object(
    'entradas', COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END), 0),
    'saidas',   COALESCE(SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END), 0)
  ) INTO _kpis
  FROM public.lancamentos
  WHERE projeto_id = _share.projeto_id
    AND data BETWEEN _share.data_inicio AND _share.data_fim;

  RETURN jsonb_build_object(
    'projeto', _projeto,
    'periodo', jsonb_build_object('inicio', _share.data_inicio, 'fim', _share.data_fim),
    'expires_at', _share.expires_at,
    'kpis', _kpis,
    'lancamentos', _lancamentos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_relatorio_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_relatorio_publico(TEXT) TO anon, authenticated;
