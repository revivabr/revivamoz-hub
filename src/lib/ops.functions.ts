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

// --- Backups ---------------------------------------------------------------

export const listBackupRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admin");
    const { data, error } = await context.supabase
      .from("backup_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runBackupNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admin");

    const origin = process.env.APP_URL
      || "https://project--4e38af4c-3639-4633-8366-8f666466ae5e.lovable.app";
    const res = await fetch(`${origin}/api/public/hooks/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify({ trigger: "manual" }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `Falha (${res.status})`);
    try { return JSON.parse(text); } catch { return { ok: true }; }
  });

export const getBackupDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admin");
    const { data: signed, error } = await context.supabase
      .storage.from("backups").createSignedUrl(data.path, 300);
    if (error || !signed) throw new Error(error?.message ?? "Erro a assinar URL");
    return { url: signed.signedUrl };
  });

