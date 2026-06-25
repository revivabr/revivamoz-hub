import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      projetoId: z.string().uuid().optional(),
      tableName: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admin");

    let q = context.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.projetoId) q = q.eq("projeto_id", data.projetoId);
    if (data.tableName) q = q.eq("table_name", data.tableName);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const exportProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projetoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    const { data: isMember } = await supabase.rpc("is_projeto_member", {
      _user_id: userId, _projeto_id: data.projetoId,
    });
    if (!isAdmin && !isMember) throw new Error("Sem permissão");

    const [projeto, lancamentos, categorias, etapas, membros, convites] = await Promise.all([
      supabase.from("projetos").select("*").eq("id", data.projetoId).single(),
      supabase.from("lancamentos").select("*").eq("projeto_id", data.projetoId),
      supabase.from("categorias").select("*").eq("projeto_id", data.projetoId),
      supabase.from("etapas").select("*").eq("projeto_id", data.projetoId),
      supabase.from("projeto_membros").select("*").eq("projeto_id", data.projetoId),
      supabase.from("projeto_convites").select("*").eq("projeto_id", data.projetoId),
    ]);

    return {
      exported_at: new Date().toISOString(),
      exported_by: userId,
      projeto: projeto.data,
      lancamentos: lancamentos.data ?? [],
      categorias: categorias.data ?? [],
      etapas: etapas.data ?? [],
      membros: membros.data ?? [],
      convites: convites.data ?? [],
    };
  });
