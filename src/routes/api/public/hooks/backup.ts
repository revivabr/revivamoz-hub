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

          // Espelhar para Google Drive (best-effort)
          let driveFileId: string | null = null;
          let driveUrl: string | null = null;
          let driveError: string | null = null;
          try {
            const lov = process.env.LOVABLE_API_KEY;
            const gkey = process.env.GOOGLE_DRIVE_API_KEY;
            if (lov && gkey) {
              const GW = "https://connector-gateway.lovable.dev/google_drive";
              const headers = {
                Authorization: `Bearer ${lov}`,
                "X-Connection-Api-Key": gkey,
              };
              const FOLDER = "RevivaMoz Backups";
              // 1. localizar ou criar pasta
              const q = encodeURIComponent(
                `name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              );
              const fr = await fetch(`${GW}/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
              const fj = await fr.json() as { files?: { id: string }[] };
              let folderId = fj.files?.[0]?.id ?? null;
              if (!folderId) {
                const cr = await fetch(`${GW}/drive/v3/files`, {
                  method: "POST",
                  headers: { ...headers, "Content-Type": "application/json" },
                  body: JSON.stringify({ name: FOLDER, mimeType: "application/vnd.google-apps.folder" }),
                });
                const cj = await cr.json() as { id?: string; error?: unknown };
                if (!cr.ok || !cj.id) throw new Error(`mkdir: ${JSON.stringify(cj)}`);
                folderId = cj.id;
              }
              // 2. multipart upload
              const fileName = path.split("/").pop()!;
              const boundary = `lvb${Math.random().toString(36).slice(2)}`;
              const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
              const body =
                `--${boundary}\r\n` +
                `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                `${metadata}\r\n` +
                `--${boundary}\r\n` +
                `Content-Type: application/json\r\n\r\n` +
                `${json}\r\n` +
                `--${boundary}--`;
              const ur = await fetch(
                `${GW}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
                {
                  method: "POST",
                  headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
                  body,
                },
              );
              const uj = await ur.json() as { id?: string; webViewLink?: string; error?: unknown };
              if (!ur.ok || !uj.id) throw new Error(`upload: ${JSON.stringify(uj)}`);
              driveFileId = uj.id;
              driveUrl = uj.webViewLink ?? `https://drive.google.com/file/d/${uj.id}/view`;
            } else {
              driveError = "Conector Google Drive não ligado";
            }
          } catch (e) {
            driveError = (e as Error).message.slice(0, 500);
          }

          await admin
            .from("backup_runs")
            .update({
              status: "success",
              finished_at: new Date().toISOString(),
              file_path: path,
              size_bytes: json.length,
              projetos_count: projetosCount,
              lancamentos_count: lancamentosCount,
              drive_file_id: driveFileId,
              drive_url: driveUrl,
              drive_error: driveError,
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
