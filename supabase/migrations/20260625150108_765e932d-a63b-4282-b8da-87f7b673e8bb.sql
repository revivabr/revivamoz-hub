
CREATE TYPE public.convite_estado AS ENUM ('pendente','aceite','revogado');

CREATE TABLE public.projeto_convites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  papel public.projeto_papel NOT NULL DEFAULT 'financiador',
  estado public.convite_estado NOT NULL DEFAULT 'pendente',
  convidado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (projeto_id, email)
);

CREATE INDEX projeto_convites_email_idx ON public.projeto_convites (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_convites TO authenticated;
GRANT ALL ON public.projeto_convites TO service_role;

ALTER TABLE public.projeto_convites ENABLE ROW LEVEL SECURITY;

-- Gestores e super admins gerem convites do projeto. Convidado vê os seus.
CREATE POLICY "Convites: ver (gestor, super admin ou convidado)"
  ON public.projeto_convites FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_projeto_gestor(auth.uid(), projeto_id)
    OR lower(email) = lower((auth.jwt() ->> 'email'))
  );

CREATE POLICY "Convites: criar (gestor ou super admin)"
  ON public.projeto_convites FOR INSERT TO authenticated
  WITH CHECK (
    convidado_por = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_projeto_gestor(auth.uid(), projeto_id)
    )
  );

CREATE POLICY "Convites: apagar (gestor ou super admin)"
  ON public.projeto_convites FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_projeto_gestor(auth.uid(), projeto_id)
  );

-- Função para o utilizador aceitar um convite pendente endereçado ao seu e-mail.
CREATE OR REPLACE FUNCTION public.accept_projeto_convite(_convite_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _projeto UUID;
  _papel public.projeto_papel;
BEGIN
  SELECT lower(email), projeto_id, papel
    INTO _email, _projeto, _papel
  FROM public.projeto_convites
  WHERE id = _convite_id AND estado = 'pendente';

  IF _projeto IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado ou já processado';
  END IF;

  IF _email <> lower((auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Este convite não é dirigido a si';
  END IF;

  INSERT INTO public.projeto_membros (projeto_id, user_id, papel)
  VALUES (_projeto, auth.uid(), _papel)
  ON CONFLICT (projeto_id, user_id) DO UPDATE SET papel = EXCLUDED.papel;

  UPDATE public.projeto_convites
     SET estado = 'aceite', accepted_at = now()
   WHERE id = _convite_id;

  RETURN 'accepted';
END;
$$;

REVOKE ALL ON FUNCTION public.accept_projeto_convite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_projeto_convite(UUID) TO authenticated;

-- Auto-aceitar convites pendentes no signup (por e-mail).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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

  IF EXISTS (SELECT 1 FROM public.super_admin_seed s WHERE lower(s.email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Aceitar convites pendentes endereçados ao e-mail desta nova conta
  INSERT INTO public.projeto_membros (projeto_id, user_id, papel)
  SELECT c.projeto_id, NEW.id, c.papel
    FROM public.projeto_convites c
   WHERE c.estado = 'pendente' AND lower(c.email) = lower(NEW.email)
  ON CONFLICT (projeto_id, user_id) DO NOTHING;

  UPDATE public.projeto_convites
     SET estado = 'aceite', accepted_at = now()
   WHERE estado = 'pendente' AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;
