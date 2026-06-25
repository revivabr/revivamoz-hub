// Camada de acesso a dados do dashboard de projeto.
// Funções puras (sem React) — testáveis e reutilizáveis.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Projeto, Categoria, Etapa, Lancamento } from "./types";

export const projetoQuery = (projetoId: string) =>
  queryOptions({
    queryKey: ["projeto", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id,nome,descricao,estado,orcamento,moeda,data_inicio,data_fim,logo_path")
        .eq("id", projetoId)
        .maybeSingle();
      if (error) throw error;
      return data as Projeto | null;
    },
  });

export const lancamentosQuery = (projetoId: string) =>
  queryOptions({
    queryKey: ["lancamentos", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id,tipo,data,valor,descricao,categoria_id,etapa_id,comprovante_path,created_by")
        .eq("projeto_id", projetoId)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Lancamento[];
    },
  });

export const etapasQuery = (projetoId: string) =>
  queryOptions({
    queryKey: ["etapas", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select("id,nome,descricao,ordem,peso,progresso,valor_previsto,data_inicio,data_fim")
        .eq("projeto_id", projetoId)
        .order("ordem");
      if (error) throw error;
      return data as Etapa[];
    },
  });

export const categoriasQuery = (projetoId: string) =>
  queryOptions({
    queryKey: ["categorias", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nome,tipo,projeto_id")
        .or(`projeto_id.is.null,projeto_id.eq.${projetoId}`)
        .order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });
