ALTER TABLE public.lancamentos ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS lancamentos_is_demo_idx ON public.lancamentos(is_demo) WHERE is_demo = true;