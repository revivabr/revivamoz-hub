
CREATE TYPE public.ai_provedor_tipo AS ENUM ('openai', 'gemini', 'opencode_go');

CREATE TABLE public.ai_provedores (
  provedor public.ai_provedor_tipo PRIMARY KEY,
  api_key TEXT NOT NULL,
  default_model TEXT NOT NULL,
  base_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provedores TO authenticated;
GRANT ALL ON public.ai_provedores TO service_role;
ALTER TABLE public.ai_provedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage ai_provedores"
  ON public.ai_provedores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_ai_provedores_updated_at
  BEFORE UPDATE ON public.ai_provedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View segura: indica que provedores estão ativos sem expor chaves (para todos os autenticados).
CREATE OR REPLACE FUNCTION public.list_ai_provedores_publico()
RETURNS TABLE(provedor public.ai_provedor_tipo, default_model TEXT, enabled BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT provedor, default_model, enabled FROM public.ai_provedores WHERE enabled = true;
$$;

CREATE TABLE public.assistente_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_conversas TO authenticated;
GRANT ALL ON public.assistente_conversas TO service_role;
ALTER TABLE public.assistente_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversas"
  ON public.assistente_conversas FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_assistente_conversas_updated_at
  BEFORE UPDATE ON public.assistente_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
