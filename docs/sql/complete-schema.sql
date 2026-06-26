-- =============================================================================
-- Reviva Moz — Schema completo consolidado
-- Para recriar a base do zero num novo projeto Supabase.
--
-- Ordem obrigatória por tabela:
--   1) CREATE TABLE
--   2) GRANTs
--   3) ENABLE ROW LEVEL SECURITY
--   4) POLICIES
--
-- Funções SECURITY DEFINER e triggers no fim.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions e Enums
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','gestor','financiador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_papel AS ENUM ('gestor','financiador','leitor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_estado AS ENUM ('planeado','ativo','pausado','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_tipo AS ENUM ('programa_social','projeto_sazonal','caixa_administrativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lancamento_tipo AS ENUM ('entrada','saida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.convite_estado AS ENUM ('pendente','aceite','revogado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_provedor_tipo AS ENUM ('openai','gemini','opencode_go');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 1. profiles
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  language text NOT NULL DEFAULT 'pt',
  position text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. user_roles
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. super_admin_seed
-- -----------------------------------------------------------------------------
CREATE TABLE public.super_admin_seed (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_seed TO authenticated;
GRANT ALL ON public.super_admin_seed TO service_role;
ALTER TABLE public.super_admin_seed ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. has_role helper (necessário antes das POLICIES seguintes)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para profiles / user_roles / super_admin_seed (dependem de has_role)
CREATE POLICY "Profiles: ver próprio ou super admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Profiles: inserir próprio" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: atualizar próprio ou super admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Roles: ver próprios" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Roles: super admin gere" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Super admins gerem seeds" ON public.super_admin_seed
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 5. projetos
-- -----------------------------------------------------------------------------
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  estado public.projeto_estado NOT NULL DEFAULT 'planeado',
  tipo public.projeto_tipo NOT NULL DEFAULT 'projeto_sazonal',
  data_inicio date,
  data_fim date,
  orcamento numeric(14,2) NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'EUR',
  logo_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. projeto_membros (precisa existir antes dos helpers is_projeto_*)
-- -----------------------------------------------------------------------------
CREATE TABLE public.projeto_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel public.projeto_papel NOT NULL DEFAULT 'leitor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, user_id)
);
CREATE INDEX idx_projeto_membros_projeto ON public.projeto_membros(projeto_id);
CREATE INDEX idx_projeto_membros_user ON public.projeto_membros(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_membros TO authenticated;
GRANT ALL ON public.projeto_membros TO service_role;
ALTER TABLE public.projeto_membros ENABLE ROW LEVEL SECURITY;

-- Helpers de membership (SECURITY DEFINER, evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_projeto_member(_user_id uuid, _projeto_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projeto_membros
    WHERE user_id = _user_id AND projeto_id = _projeto_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_projeto_gestor(_user_id uuid, _projeto_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projeto_membros
    WHERE user_id = _user_id AND projeto_id = _projeto_id AND papel = 'gestor'
  )
$$;

-- Policies de projetos (dependem dos helpers acima)
CREATE POLICY "Projetos: ver se membro ou super admin" ON public.projetos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_member(auth.uid(), id));
CREATE POLICY "Projetos: criar (super admin ou gestor)" ON public.projetos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'gestor')));
CREATE POLICY "Projetos: atualizar (super admin ou gestor do projeto)" ON public.projetos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), id));
CREATE POLICY "Projetos: apagar (apenas super admin)" ON public.projetos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Membros: ver se membro do mesmo projeto" ON public.projeto_membros
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_member(auth.uid(), projeto_id));
CREATE POLICY "Membros: gerir (super admin ou gestor do projeto)" ON public.projeto_membros
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id));

-- -----------------------------------------------------------------------------
-- 7. projeto_convites
-- -----------------------------------------------------------------------------
CREATE TABLE public.projeto_convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  email text NOT NULL,
  papel public.projeto_papel NOT NULL DEFAULT 'financiador',
  estado public.convite_estado NOT NULL DEFAULT 'pendente',
  convidado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (projeto_id, email)
);
CREATE INDEX projeto_convites_email_idx ON public.projeto_convites(lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_convites TO authenticated;
GRANT ALL ON public.projeto_convites TO service_role;
ALTER TABLE public.projeto_convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Convites: ver (gestor, super admin ou convidado)" ON public.projeto_convites
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.is_projeto_gestor(auth.uid(), projeto_id)
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );
CREATE POLICY "Convites: criar (gestor ou super admin)" ON public.projeto_convites
  FOR INSERT TO authenticated
  WITH CHECK (convidado_por = auth.uid() AND (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id)));
CREATE POLICY "Convites: apagar (gestor ou super admin)" ON public.projeto_convites
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id));

-- -----------------------------------------------------------------------------
-- 8. categorias
-- -----------------------------------------------------------------------------
CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo public.lancamento_tipo NOT NULL,
  nome text NOT NULL,
  cor text,
  icone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categorias_projeto ON public.categorias(projeto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver categorias globais ou do projeto" ON public.categorias
  FOR SELECT TO authenticated
  USING (projeto_id IS NULL OR public.is_projeto_member(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Gestores e super admins gerem categorias do projeto" ON public.categorias
  FOR ALL TO authenticated
  USING ((projeto_id IS NOT NULL AND public.is_projeto_gestor(auth.uid(), projeto_id)) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK ((projeto_id IS NOT NULL AND public.is_projeto_gestor(auth.uid(), projeto_id)) OR public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 9. etapas
-- -----------------------------------------------------------------------------
CREATE TABLE public.etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  peso numeric(5,2) NOT NULL DEFAULT 0,
  progresso numeric(5,2) NOT NULL DEFAULT 0,
  valor_previsto numeric(14,2) NOT NULL DEFAULT 0,
  data_inicio date,
  data_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_etapas_projeto ON public.etapas(projeto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapas TO authenticated;
GRANT ALL ON public.etapas TO service_role;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem etapas do projeto" ON public.etapas
  FOR SELECT TO authenticated
  USING (public.is_projeto_member(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Gestores gerem etapas" ON public.etapas
  FOR ALL TO authenticated
  USING (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 10. lancamentos
-- -----------------------------------------------------------------------------
CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo public.lancamento_tipo NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric(14,2) NOT NULL,
  descricao text,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  etapa_id uuid REFERENCES public.etapas(id) ON DELETE SET NULL,
  comprovante_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lancamentos_projeto_data ON public.lancamentos(projeto_id, data DESC);
CREATE INDEX idx_lancamentos_etapa ON public.lancamentos(etapa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem lancamentos do projeto" ON public.lancamentos
  FOR SELECT TO authenticated
  USING (public.is_projeto_member(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Gestores criam lancamentos" ON public.lancamentos
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "Gestores atualizam lancamentos" ON public.lancamentos
  FOR UPDATE TO authenticated
  USING (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Gestores apagam lancamentos" ON public.lancamentos
  FOR DELETE TO authenticated
  USING (public.is_projeto_gestor(auth.uid(), projeto_id) OR public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 11. relatorio_partilhas
-- -----------------------------------------------------------------------------
CREATE TABLE public.relatorio_partilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_partilhas TO authenticated;
GRANT ALL ON public.relatorio_partilhas TO service_role;
ALTER TABLE public.relatorio_partilhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view shares of own projects" ON public.relatorio_partilhas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_member(auth.uid(), projeto_id));
CREATE POLICY "manage shares as gestor/super" ON public.relatorio_partilhas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_projeto_gestor(auth.uid(), projeto_id));

-- -----------------------------------------------------------------------------
-- 12. ai_provedores
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_provedores (
  provedor public.ai_provedor_tipo PRIMARY KEY,
  api_key text NOT NULL,
  default_model text NOT NULL,
  base_url text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provedores TO authenticated;
GRANT ALL ON public.ai_provedores TO service_role;
ALTER TABLE public.ai_provedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage ai_provedores" ON public.ai_provedores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 13. assistente_conversas
-- -----------------------------------------------------------------------------
CREATE TABLE public.assistente_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Nova conversa',
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_conversas TO authenticated;
GRANT ALL ON public.assistente_conversas TO service_role;
ALTER TABLE public.assistente_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversas" ON public.assistente_conversas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 14. notificacoes
-- -----------------------------------------------------------------------------
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  link text,
  lida boolean NOT NULL DEFAULT false,
  email_enviado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notificacoes_user_created_idx ON public.notificacoes(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notif" ON public.notificacoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notif" ON public.notificacoes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 15. audit_log
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  projeto_id uuid,
  old_data jsonb,
  new_data jsonb
);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_projeto ON public.audit_log(projeto_id);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- -----------------------------------------------------------------------------
-- 16. backup_runs
-- -----------------------------------------------------------------------------
CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'cron',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  file_path text,
  size_bytes bigint,
  projetos_count integer,
  lancamentos_count integer,
  error text,
  drive_file_id text,
  drive_url text,
  drive_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX backup_runs_started_at_idx ON public.backup_runs(started_at DESC);
GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins veem backups" ON public.backup_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- =============================================================================
-- FUNÇÕES DE SUPORTE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Trigger genérico de updated_at para tabelas relevantes
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'profiles','projetos','categorias','etapas','lancamentos',
    'relatorio_partilhas','assistente_conversas'
  ]) AS t LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      r.t, r.t
    );
  END LOOP;
END $$;

-- Auto-criação do perfil e auto-aplicação de seeds/convites no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language','pt')
  );

  IF EXISTS (SELECT 1 FROM public.super_admin_seed s WHERE lower(s.email)=lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.projeto_membros (projeto_id, user_id, papel)
  SELECT c.projeto_id, NEW.id, c.papel
    FROM public.projeto_convites c
   WHERE c.estado='pendente' AND lower(c.email)=lower(NEW.email)
  ON CONFLICT (projeto_id, user_id) DO NOTHING;

  UPDATE public.projeto_convites
     SET estado='aceite', accepted_at=now()
   WHERE estado='pendente' AND lower(email)=lower(NEW.email);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Gestão de super admins
CREATE OR REPLACE FUNCTION public.grant_super_admin_by_email(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Apenas Super Admins podem promover outros utilizadores';
  END IF;
  INSERT INTO public.super_admin_seed(email) VALUES (lower(_email)) ON CONFLICT DO NOTHING;
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=lower(_email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid,'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'granted';
  END IF;
  RETURN 'queued';
END $$;

CREATE OR REPLACE FUNCTION public.revoke_super_admin_by_email(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Apenas Super Admins podem remover este papel';
  END IF;
  DELETE FROM public.super_admin_seed WHERE lower(email)=lower(_email);
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=lower(_email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id=_uid AND role='super_admin';
  END IF;
  RETURN 'revoked';
END $$;

CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS TABLE(email text, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Apenas Super Admins podem ver esta lista';
  END IF;
  RETURN QUERY
    SELECT lower(u.email)::text, 'active'::text
      FROM auth.users u
      JOIN public.user_roles r ON r.user_id=u.id AND r.role='super_admin'
    UNION
    SELECT lower(s.email)::text, 'pending'::text
      FROM public.super_admin_seed s
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.users u2
        JOIN public.user_roles r2 ON r2.user_id=u2.id AND r2.role='super_admin'
        WHERE lower(u2.email)=lower(s.email)
      );
END $$;

-- Aceitar convite manualmente
CREATE OR REPLACE FUNCTION public.accept_projeto_convite(_convite_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _projeto uuid; _papel public.projeto_papel;
BEGIN
  SELECT lower(email), projeto_id, papel INTO _email, _projeto, _papel
    FROM public.projeto_convites
   WHERE id=_convite_id AND estado='pendente';
  IF _projeto IS NULL THEN RAISE EXCEPTION 'Convite não encontrado ou já processado'; END IF;
  IF _email <> lower(auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Este convite não é dirigido a si';
  END IF;
  INSERT INTO public.projeto_membros(projeto_id,user_id,papel)
    VALUES (_projeto, auth.uid(), _papel)
    ON CONFLICT (projeto_id,user_id) DO UPDATE SET papel=EXCLUDED.papel;
  UPDATE public.projeto_convites SET estado='aceite', accepted_at=now() WHERE id=_convite_id;
  RETURN 'accepted';
END $$;

-- Meta dos provedores IA ativos (sem expor api_key)
CREATE OR REPLACE FUNCTION public.list_ai_provedores_publico()
RETURNS TABLE(provedor public.ai_provedor_tipo, default_model text, enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT provedor, default_model, enabled FROM public.ai_provedores WHERE enabled=true;
$$;

-- Audit trigger
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text := NULLIF(current_setting('request.jwt.claims', true),'')::jsonb->>'email';
  v_projeto uuid; v_record text; v_old jsonb; v_new jsonb;
BEGIN
  IF TG_OP='DELETE' THEN
    v_old := to_jsonb(OLD); v_record := v_old->>'id'; v_projeto := NULLIF(v_old->>'projeto_id','')::uuid;
  ELSIF TG_OP='INSERT' THEN
    v_new := to_jsonb(NEW); v_record := v_new->>'id'; v_projeto := NULLIF(v_new->>'projeto_id','')::uuid;
  ELSE
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_record := v_new->>'id'; v_projeto := NULLIF(v_new->>'projeto_id','')::uuid;
  END IF;
  INSERT INTO public.audit_log(actor_id,actor_email,table_name,operation,record_id,projeto_id,old_data,new_data)
  VALUES (v_actor, v_email, TG_TABLE_NAME, TG_OP, v_record, v_projeto, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT unnest(ARRAY['lancamentos','projetos','etapas','projeto_membros','categorias']) AS t LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();',
      r.t, r.t
    );
  END LOOP;
END $$;

-- Portal público de relatórios
CREATE OR REPLACE FUNCTION public.get_relatorio_publico(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _share record; _projeto jsonb; _lancamentos jsonb; _kpis jsonb;
BEGIN
  SELECT * INTO _share FROM public.relatorio_partilhas
   WHERE token=_token AND NOT revoked AND expires_at>now() LIMIT 1;
  IF _share IS NULL THEN RETURN NULL; END IF;

  SELECT to_jsonb(p) - 'created_by' INTO _projeto FROM public.projetos p WHERE id=_share.projeto_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',l.id,'data',l.data,'tipo',l.tipo,'valor',l.valor,
    'descricao',l.descricao,'categoria',c.nome
  ) ORDER BY l.data DESC), '[]'::jsonb)
  INTO _lancamentos
  FROM public.lancamentos l
  LEFT JOIN public.categorias c ON c.id=l.categoria_id
  WHERE l.projeto_id=_share.projeto_id AND l.data BETWEEN _share.data_inicio AND _share.data_fim;

  SELECT jsonb_build_object(
    'entradas', COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0),
    'saidas',   COALESCE(SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END),0)
  ) INTO _kpis
  FROM public.lancamentos
  WHERE projeto_id=_share.projeto_id AND data BETWEEN _share.data_inicio AND _share.data_fim;

  RETURN jsonb_build_object(
    'projeto', _projeto,
    'periodo', jsonb_build_object('inicio',_share.data_inicio,'fim',_share.data_fim),
    'expires_at', _share.expires_at,
    'kpis', _kpis,
    'lancamentos', _lancamentos
  );
END $$;

-- =============================================================================
-- LOCK-DOWN DE EXECUTE EM FUNÇÕES SECURITY DEFINER
-- =============================================================================
-- Por defeito o Postgres concede EXECUTE em todas as funções a PUBLIC.
-- Revogamos tudo e voltamos a conceder apenas o estritamente necessário.

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Helpers de RLS chamados implicitamente pelas policies — precisam de EXECUTE
-- ao role authenticated, caso contrário toda a aplicação devolve permission denied.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_member(uuid, uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_projeto_gestor(uuid, uuid)   TO authenticated;

-- RPCs invocadas pela UI (apenas utilizadores autenticados)
GRANT EXECUTE ON FUNCTION public.accept_projeto_convite(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_super_admin_by_email(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_super_admin_by_email(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_provedores_publico()        TO authenticated;

-- Portal público de relatórios (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_relatorio_publico(text) TO anon, authenticated;

-- service_role mantém acesso completo
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

