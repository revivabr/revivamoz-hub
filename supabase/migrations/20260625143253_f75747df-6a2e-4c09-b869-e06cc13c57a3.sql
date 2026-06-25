
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'gestor', 'financiador');
CREATE TYPE public.projeto_papel AS ENUM ('gestor', 'financiador', 'leitor');
CREATE TYPE public.projeto_estado AS ENUM ('planeado', 'ativo', 'pausado', 'concluido', 'cancelado');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'pt',
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer: avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ PROJETOS ============
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  estado public.projeto_estado NOT NULL DEFAULT 'planeado',
  data_inicio DATE,
  data_fim DATE,
  orcamento NUMERIC(14,2) NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'EUR',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_projetos_updated_at
BEFORE UPDATE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROJETO_MEMBROS ============
CREATE TABLE public.projeto_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel public.projeto_papel NOT NULL DEFAULT 'leitor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_membros TO authenticated;
GRANT ALL ON public.projeto_membros TO service_role;

ALTER TABLE public.projeto_membros ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_projeto_membros_user ON public.projeto_membros(user_id);
CREATE INDEX idx_projeto_membros_projeto ON public.projeto_membros(projeto_id);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_projeto_member(_user_id UUID, _projeto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projeto_membros
    WHERE user_id = _user_id AND projeto_id = _projeto_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_projeto_gestor(_user_id UUID, _projeto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projeto_membros
    WHERE user_id = _user_id AND projeto_id = _projeto_id AND papel = 'gestor'
  )
$$;

-- ============ POLICIES: profiles ============
CREATE POLICY "Profiles: ver próprio ou super admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Profiles: inserir próprio"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: atualizar próprio ou super admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

-- ============ POLICIES: user_roles ============
CREATE POLICY "Roles: ver próprios"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Roles: super admin gere"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ POLICIES: projetos ============
CREATE POLICY "Projetos: ver se membro ou super admin"
ON public.projetos FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_projeto_member(auth.uid(), id)
);

CREATE POLICY "Projetos: criar (super admin ou gestor)"
ON public.projetos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'gestor'))
);

CREATE POLICY "Projetos: atualizar (super admin ou gestor do projeto)"
ON public.projetos FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_projeto_gestor(auth.uid(), id)
);

CREATE POLICY "Projetos: apagar (apenas super admin)"
ON public.projetos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ============ POLICIES: projeto_membros ============
CREATE POLICY "Membros: ver se membro do mesmo projeto"
ON public.projeto_membros FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_projeto_member(auth.uid(), projeto_id)
);

CREATE POLICY "Membros: gerir (super admin ou gestor do projeto)"
ON public.projeto_membros FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_projeto_gestor(auth.uid(), projeto_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_projeto_gestor(auth.uid(), projeto_id)
);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language', 'pt')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
