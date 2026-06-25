-- =============================================================================
-- Reviva Moz — Seed
-- Executar APÓS complete-schema.sql e storage.sql, e APÓS o super admin
-- ter feito login pela primeira vez (para que o trigger handle_new_user
-- crie o registo em auth.users e atribua o papel).
-- =============================================================================

-- 1. Garante super admin "rafaelcvn@gmail.com"
INSERT INTO public.super_admin_seed(email) VALUES ('rafaelcvn@gmail.com')
ON CONFLICT DO NOTHING;

-- Se o utilizador já existe, garantir role
INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'super_admin'::public.app_role
  FROM auth.users u
 WHERE lower(u.email)='rafaelcvn@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Projetos base (criados pelo super admin)
DO $$
DECLARE _admin uuid;
BEGIN
  SELECT id INTO _admin FROM auth.users WHERE lower(email)='rafaelcvn@gmail.com' LIMIT 1;
  IF _admin IS NULL THEN
    RAISE NOTICE 'Super admin ainda não fez login. Salte o seed de projetos por agora.';
    RETURN;
  END IF;

  -- Programas Sociais (orçamento mensal 20.000 MZM)
  INSERT INTO public.projetos(nome, tipo, orcamento, moeda, estado, created_by) VALUES
    ('PEPE Emunah',  'programa_social', 20000, 'MZN', 'ativo', _admin),
    ('PEPE Nahene',  'programa_social', 20000, 'MZN', 'ativo', _admin),
    ('PEPE Yeshua',  'programa_social', 20000, 'MZN', 'ativo', _admin),
    ('PEPE Hope',    'programa_social', 20000, 'MZN', 'ativo', _admin),
    ('PEPE Reviva',  'programa_social', 20000, 'MZN', 'ativo', _admin)
  ON CONFLICT DO NOTHING;

  -- Projetos Sazonais
  INSERT INTO public.projetos(nome, tipo, orcamento, moeda, estado, created_by) VALUES
    ('Construção: Galpão Esportivo', 'projeto_sazonal', 0, 'MZN', 'planeado', _admin)
  ON CONFLICT DO NOTHING;

  -- Caixas Administrativos
  INSERT INTO public.projetos(nome, tipo, orcamento, moeda, estado, created_by) VALUES
    ('Reviva-Moz Adm Geral',    'caixa_administrativo', 0, 'MZN', 'ativo', _admin),
    ('TBE',                     'caixa_administrativo', 0, 'MZN', 'ativo', _admin),
    ('Igreja CEN',              'caixa_administrativo', 0, 'MZN', 'ativo', _admin),
    ('Base Missionária',        'caixa_administrativo', 0, 'MZN', 'ativo', _admin),
    ('Caminhão Água',           'caixa_administrativo', 0, 'MZN', 'ativo', _admin),
    ('Caminhão Basculante',     'caixa_administrativo', 0, 'MZN', 'ativo', _admin)
  ON CONFLICT DO NOTHING;

  -- Tornar o super admin gestor de todos os projetos criados
  INSERT INTO public.projeto_membros(projeto_id, user_id, papel)
  SELECT p.id, _admin, 'gestor'::public.projeto_papel
    FROM public.projetos p
    LEFT JOIN public.projeto_membros m ON m.projeto_id=p.id AND m.user_id=_admin
   WHERE m.id IS NULL;
END $$;

-- 3. Categorias globais por defeito (projeto_id NULL = visíveis a todos os projetos)
INSERT INTO public.categorias(projeto_id, tipo, nome) VALUES
  (NULL, 'entrada', 'Doações'),
  (NULL, 'entrada', 'Subvenções'),
  (NULL, 'entrada', 'Outras receitas'),
  (NULL, 'saida',   'Alimentação'),
  (NULL, 'saida',   'Transporte'),
  (NULL, 'saida',   'Materiais'),
  (NULL, 'saida',   'Salários'),
  (NULL, 'saida',   'Serviços'),
  (NULL, 'saida',   'Outros')
ON CONFLICT DO NOTHING;
