import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Marcador único — TODOS os lançamentos fictícios usam is_demo=true.
// A limpeza filtra exclusivamente por essa flag, garantindo que nenhum
// projeto, utilizador, categoria ou lançamento real seja afetado.

async function ensureSuperAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "super_admin",
  });
  if (!isAdmin) throw new Error("Apenas Super Admins.");
}

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Limpa demos anteriores antes de re-semear (idempotente).
    await supabaseAdmin.from("lancamentos").delete().eq("is_demo", true);

    const { data: projetos, error: pErr } = await supabaseAdmin
      .from("projetos").select("id, nome, tipo, orcamento");
    if (pErr) throw new Error(pErr.message);

    const { data: cats, error: cErr } = await supabaseAdmin
      .from("categorias").select("id, nome, tipo, projeto_id");
    if (cErr) throw new Error(cErr.message);

    const entradasGlobais = (cats ?? []).filter((c) => c.tipo === "entrada" && c.projeto_id === null);
    const saidasGlobais   = (cats ?? []).filter((c) => c.tipo === "saida"   && c.projeto_id === null);
    if (!entradasGlobais.length || !saidasGlobais.length) {
      throw new Error("Categorias globais ausentes. Execute o seed inicial.");
    }

    const today = new Date();
    const rows: Array<Record<string, any>> = [];
    // 6 meses retroativos × 13 projetos.
    for (const p of projetos ?? []) {
      const base = Number(p.orcamento) > 0 ? Number(p.orcamento) : 18000;
      for (let m = 5; m >= 0; m--) {
        const ref = new Date(today.getFullYear(), today.getMonth() - m, 1);
        // 2 entradas
        for (let i = 0; i < 2; i++) {
          const cat = entradasGlobais[(m + i) % entradasGlobais.length];
          const day = 3 + i * 10;
          rows.push({
            projeto_id: p.id, tipo: "entrada", is_demo: true,
            data: new Date(ref.getFullYear(), ref.getMonth(), day).toISOString().slice(0, 10),
            valor: Math.round(base * (0.45 + Math.random() * 0.25)),
            descricao: `[DEMO] Entrada simulada ${i + 1}`,
            categoria_id: cat.id, created_by: context.userId,
          });
        }
        // 3 saídas
        for (let i = 0; i < 3; i++) {
          const cat = saidasGlobais[(m + i) % saidasGlobais.length];
          const day = 6 + i * 7;
          rows.push({
            projeto_id: p.id, tipo: "saida", is_demo: true,
            data: new Date(ref.getFullYear(), ref.getMonth(), day).toISOString().slice(0, 10),
            valor: Math.round(base * (0.12 + Math.random() * 0.22)),
            descricao: `[DEMO] Despesa simulada ${i + 1}`,
            categoria_id: cat.id, created_by: context.userId,
          });
        }
      }
    }

    // Insere em lotes de 500.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabaseAdmin.from("lancamentos").insert(chunk);
      if (error) throw new Error(error.message);
      inserted += chunk.length;
    }
    return { inserted, projetos: projetos?.length ?? 0 };
  });

export const clearDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // SOMENTE linhas marcadas is_demo=true. Projetos, utilizadores,
    // categorias e lançamentos reais permanecem intactos.
    const { error, count } = await supabaseAdmin
      .from("lancamentos").delete({ count: "exact" }).eq("is_demo", true);
    if (error) throw new Error(error.message);
    return { removed: count ?? 0 };
  });

export const countDemoData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("lancamentos").select("id", { count: "exact", head: true }).eq("is_demo", true);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
