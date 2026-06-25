
-- 1) Tabela de histórico de execuções de backup
CREATE TABLE public.backup_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'running', -- running | success | error
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  file_path TEXT,
  size_bytes BIGINT,
  projetos_count INTEGER,
  lancamentos_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins veem backups"
  ON public.backup_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX backup_runs_started_at_idx ON public.backup_runs (started_at DESC);

-- 2) Políticas RLS do bucket de backups (apenas service_role escreve; super admins leem)
CREATE POLICY "Super admins leem ficheiros de backup"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));
