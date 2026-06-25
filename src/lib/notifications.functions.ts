import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sendBrevoEmail(opts: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, error: "BREVO_API_KEY ausente" };
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "info-noreplay@revivamoz.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Reviva Moz";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: opts.to,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

function wrapHtml(titulo: string, mensagem: string, link?: string) {
  const cta = link
    ? `<p style="margin:24px 0"><a href="${link}" style="background:#0ea5e9;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Abrir</a></p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
      <h2 style="margin:0 0 12px;color:#111827">${titulo}</h2>
      <p style="margin:0;color:#374151;line-height:1.55">${mensagem}</p>
      ${cta}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="margin:0;color:#9ca3af;font-size:12px">Reviva Moz — notificação automática. Não responda a este e-mail.</p>
    </div>
  </div>`;
}

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userIds: z.array(z.string().uuid()).min(1),
      titulo: z.string().min(1),
      mensagem: z.string().min(1),
      tipo: z.string().optional(),
      link: z.string().optional(),
      enviarEmail: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const rows = data.userIds.map((uid) => ({
      user_id: uid,
      titulo: data.titulo,
      mensagem: data.mensagem,
      tipo: data.tipo ?? "info",
      link: data.link ?? null,
    }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("notificacoes")
      .insert(rows)
      .select("id, user_id");
    if (error) throw new Error(error.message);

    if (data.enviarEmail) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const emailByUser = new Map<string, string>();
      for (const u of users?.users ?? []) {
        if (u.email && data.userIds.includes(u.id)) emailByUser.set(u.id, u.email);
      }
      const targets = Array.from(emailByUser.entries());
      if (targets.length > 0) {
        const send = await sendBrevoEmail({
          to: targets.map(([, email]) => ({ email })),
          subject: data.titulo,
          htmlContent: wrapHtml(data.titulo, data.mensagem, data.link),
        });
        if (send.ok && inserted) {
          const ids = inserted.map((r) => r.id);
          await supabaseAdmin.from("notificacoes").update({ email_enviado: true }).in("id", ids);
        }
        return { inserted: inserted?.length ?? 0, email: send };
      }
    }
    return { inserted: inserted?.length ?? 0, email: { ok: false, skipped: true } };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, link, lida, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("notificacoes").update({ lida: true }).eq("user_id", userId);
    if (data.ids && data.ids.length > 0) q = q.in("id", data.ids);
    else q = q.eq("lida", false);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testBrevoEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ to: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const res = await sendBrevoEmail({
      to: [{ email: data.to }],
      subject: "Teste de e-mail — Reviva Moz",
      htmlContent: wrapHtml(
        "Teste de e-mail",
        "Se está a ler isto, a integração Brevo está a funcionar corretamente.",
      ),
    });
    if (!res.ok) throw new Error(res.error ?? "Falha no envio");
    return res;
  });

export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      email: z.string().email(),
      projetoNome: z.string(),
      papel: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const link = "https://revivamoz-hub.lovable.app/auth";
    const res = await sendBrevoEmail({
      to: [{ email: data.email }],
      subject: `Convite para o projeto ${data.projetoNome}`,
      htmlContent: wrapHtml(
        `Foi convidado para "${data.projetoNome}"`,
        `Foi adicionado como <strong>${data.papel}</strong> no projeto <strong>${data.projetoNome}</strong> no Reviva Moz. Inicie sessão com este e-mail para aceder.`,
        link,
      ),
    });
    if (!res.ok) throw new Error(res.error ?? "Falha no envio");
    return res;
  });

