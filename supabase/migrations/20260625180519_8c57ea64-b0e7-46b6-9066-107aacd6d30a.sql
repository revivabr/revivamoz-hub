
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,
  actor_email TEXT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  record_id TEXT,
  projeto_id UUID,
  old_data JSONB,
  new_data JSONB
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_projeto ON public.audit_log (projeto_id);
CREATE INDEX idx_audit_log_table ON public.audit_log (table_name);

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_email TEXT := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'email';
  v_projeto UUID;
  v_record TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record := (v_old->>'id');
    v_projeto := NULLIF(v_old->>'projeto_id','')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record := (v_new->>'id');
    v_projeto := NULLIF(v_new->>'projeto_id','')::uuid;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record := (v_new->>'id');
    v_projeto := NULLIF(v_new->>'projeto_id','')::uuid;
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_email, table_name, operation, record_id, projeto_id, old_data, new_data)
  VALUES (v_actor, v_email, TG_TABLE_NAME, TG_OP, v_record, v_projeto, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_projetos
  AFTER INSERT OR UPDATE OR DELETE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_lancamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_projeto_membros
  AFTER INSERT OR UPDATE OR DELETE ON public.projeto_membros
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_projeto_convites
  AFTER INSERT OR UPDATE OR DELETE ON public.projeto_convites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_ai_provedores
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_provedores
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
