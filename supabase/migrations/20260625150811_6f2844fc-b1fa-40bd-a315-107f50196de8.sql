
-- Enum tipo
CREATE TYPE public.lancamento_tipo AS ENUM ('entrada', 'saida');

-- =========================
-- CATEGORIAS
-- =========================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo public.lancamento_tipo NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT,
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categorias_projeto ON public.categorias(projeto_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver categorias globais ou do projeto" ON public.categorias
  FOR SELECT TO authenticated USING (
    projeto_id IS NULL
    OR public.is_projeto_member(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Gestores e super admins gerem categorias do projeto" ON public.categorias
  FOR ALL TO authenticated USING (
    (projeto_id IS NOT NULL AND public.is_projeto_gestor(auth.uid(), projeto_id))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    (projeto_id IS NOT NULL AND public.is_projeto_gestor(auth.uid(), projeto_id))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- ETAPAS
-- =========================
CREATE TABLE public.etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  peso NUMERIC(5,2) NOT NULL DEFAULT 0,           -- % do projeto
  progresso NUMERIC(5,2) NOT NULL DEFAULT 0,      -- 0..100
  valor_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_etapas_projeto ON public.etapas(projeto_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapas TO authenticated;
GRANT ALL ON public.etapas TO service_role;

ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem etapas do projeto" ON public.etapas
  FOR SELECT TO authenticated USING (
    public.is_projeto_member(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Gestores gerem etapas" ON public.etapas
  FOR ALL TO authenticated USING (
    public.is_projeto_gestor(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.is_projeto_gestor(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_etapas_updated BEFORE UPDATE ON public.etapas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- LANCAMENTOS
-- =========================
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo public.lancamento_tipo NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
  comprovante_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lancamentos_projeto_data ON public.lancamentos(projeto_id, data DESC);
CREATE INDEX idx_lancamentos_etapa ON public.lancamentos(etapa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem lancamentos do projeto" ON public.lancamentos
  FOR SELECT TO authenticated USING (
    public.is_projeto_member(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Gestores criam lancamentos" ON public.lancamentos
  FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid() AND (
      public.is_projeto_gestor(auth.uid(), projeto_id)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Gestores atualizam lancamentos" ON public.lancamentos
  FOR UPDATE TO authenticated USING (
    public.is_projeto_gestor(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.is_projeto_gestor(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Gestores apagam lancamentos" ON public.lancamentos
  FOR DELETE TO authenticated USING (
    public.is_projeto_gestor(auth.uid(), projeto_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SEED categorias globais
-- =========================
INSERT INTO public.categorias (tipo, nome, icone) VALUES
  ('entrada','Financiamento','Banknote'),
  ('entrada','Doação','HandCoins'),
  ('entrada','Outras receitas','Plus'),
  ('saida','Materiais','Package'),
  ('saida','Mão de obra','HardHat'),
  ('saida','Transporte','Truck'),
  ('saida','Alimentação','Utensils'),
  ('saida','Serviços','Wrench'),
  ('saida','Outros','MoreHorizontal');
