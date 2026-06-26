
CREATE INDEX IF NOT EXISTS idx_assistente_conversas_user_updated
  ON public.assistente_conversas (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_assistente_conversas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.assistente_conversas
   WHERE updated_at < now() - interval '7 days';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_assistente_conversas() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_assistente_conversas_daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup_assistente_conversas_daily',
  '15 3 * * *',
  $$ SELECT public.cleanup_assistente_conversas(); $$
);
