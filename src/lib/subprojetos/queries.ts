// Camada de acesso a dados para a página de Projetos Ativos.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Projeto, Membro, Convite } from "./types";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => (await supabase.auth.getUser()).data.user,
});

export const isSuperAdminQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["is-super-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId!, _role: "super_admin",
      });
      if (error) throw error;
      return !!data;
    },
  });

export const projetosListQuery = queryOptions({
  queryKey: ["projetos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("projetos")
      .select("id,nome,descricao,estado,tipo,orcamento,moeda,data_inicio,data_fim,created_by,logo_path")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Projeto[];
  },
});

export const membrosQuery = (projetoId: string) =>
  queryOptions({
    queryKey: ["membros", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_membros")
        .select("id,user_id,papel, profiles:profiles!projeto_membros_user_id_fkey(full_name)")
        .eq("projeto_id", projetoId);
      if (error) throw error;
      return data as unknown as Membro[];
    },
  });

export const convitesProjetoQuery = (projetoId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["convites", projetoId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_convites")
        .select("id,email,papel,estado,created_at")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Convite[];
    },
  });

export const meusConvitesQuery = queryOptions({
  queryKey: ["meus-convites"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const email = u.user?.email;
    if (!email) return [];
    const { data, error } = await supabase
      .from("projeto_convites")
      .select("id,email,papel,estado,created_at, projetos:projetos(nome)")
      .eq("estado", "pendente")
      .ilike("email", email);
    if (error) throw error;
    return data as Array<Convite & { projetos: { nome: string } | null }>;
  },
});
