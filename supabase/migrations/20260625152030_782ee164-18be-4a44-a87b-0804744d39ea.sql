CREATE TYPE public.projeto_tipo AS ENUM ('programa_social','projeto_sazonal');
ALTER TABLE public.projetos ADD COLUMN tipo public.projeto_tipo NOT NULL DEFAULT 'projeto_sazonal';