
-- Seed table of emails that should auto-become super_admin upon signup
CREATE TABLE IF NOT EXISTS public.super_admin_seed (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.super_admin_seed TO service_role;
ALTER TABLE public.super_admin_seed ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role / SECURITY DEFINER functions touch this table.

INSERT INTO public.super_admin_seed (email) VALUES ('rafaelcvn@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- If account already exists, assign role now
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE lower(u.email) = lower('rafaelcvn@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user to also seed super_admin role from the seed table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant super_admin by email (callable by any existing super_admin)
CREATE OR REPLACE FUNCTION public.grant_super_admin_by_email(_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admins podem promover outros utilizadores';
  END IF;

  INSERT INTO public.super_admin_seed (email) VALUES (lower(_email))
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'granted';
  END IF;

  RETURN 'queued'; -- will be granted automatically when the user signs up
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_super_admin_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_super_admin_by_email(TEXT) TO authenticated;

-- Revoke super_admin by email
CREATE OR REPLACE FUNCTION public.revoke_super_admin_by_email(_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admins podem remover este papel';
  END IF;

  DELETE FROM public.super_admin_seed WHERE lower(email) = lower(_email);

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin'::app_role;
  END IF;

  RETURN 'revoked';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_super_admin_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_super_admin_by_email(TEXT) TO authenticated;

-- List super admins (and queued seeds)
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS TABLE(email TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admins podem ver esta lista';
  END IF;

  RETURN QUERY
  SELECT lower(u.email)::TEXT AS email, 'active'::TEXT AS status
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'super_admin'::app_role
  UNION
  SELECT lower(s.email)::TEXT, 'pending'::TEXT
  FROM public.super_admin_seed s
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u2
    JOIN public.user_roles r2 ON r2.user_id = u2.id AND r2.role = 'super_admin'::app_role
    WHERE lower(u2.email) = lower(s.email)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_super_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
