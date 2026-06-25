// Hook de backup acionado por pg_cron (12:00 e 22:00 Maputo).
// Lê todos os dados administrativos com service role e grava um JSON no bucket "backups".
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Autorização simples: apikey == publishable key.
        const apikey = request.headers.get("apikey") || "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || "";
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = (await request.json().catch(() => ({}))) as { trigger?: string };
        const trigger = body.trigger || "cron";

        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: run, error: runErr } = await admin
          .from("backup_runs")
          .insert({ trigger, status: "running" })
          .select("id")
          .single();
        if (runErr || !run) {
          return new Response(JSON.stringify({ error: runErr?.message ?? "no run" }), { status: 500 });
        }

        try {
          const tables = [
            "profiles", "user_roles", "projetos", "projeto_membros",
            "projeto_convites", "categorias", "etapas", "lancamentos",
            "relatorio_partilhas", "ai_provedores", "notificacoes", "audit_log",
          ] as const;

          const dump: Record<string, unknown> = {
            generated_at: new Date().toISOString(),
            trigger,
            version: 1,
          };
          let lancamentosCount = 0;
          let projetosCount = 0;

          for (const t of tables) {
            const { data, error } = await admin.from(t).select("*");
            if (error) throw new Error(`${t}: ${error.message}`);
            dump[t] = data ?? [];
            if (t === "lancamentos") lancamentosCount = data?.length ?? 0;
            if (t === "projetos") projetosCount = data?.length ?? 0;
          }

          const json = JSON.stringify(dump);
          const now = new Date();
          const stamp = now.toISOString().replace(/[:.]/g, "-");
          const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/backup-${stamp}.json`;

          const { error: upErr } = await admin.storage
            .from("backups")
            .upload(path, new Blob([json], { type: "application/json" }), { upsert: false });
          if (upErr) throw new Error(`upload: ${upErr.message}`);

          await admin
            .from("backup_runs")
            .update({
              status: "success",
              finished_at: new Date().toISOString(),
              file_path: path,
              size_bytes: json.length,
              projetos_count: projetosCount,
              lancamentos_count: lancamentosCount,
            })
            .eq("id", run.id);

          return new Response(
            JSON.stringify({ ok: true, path, size: json.length, projetos: projetosCount }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          const msg = (e as Error).message;
          await admin
            .from("backup_runs")
            .update({ status: "error", finished_at: new Date().toISOString(), error: msg })
            .eq("id", run.id);
          return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
        }
      },
    },
  },
});
