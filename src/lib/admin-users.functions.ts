import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(1),
  projetoId: z.string().uuid(),
  papel: z.enum(["gestor", "financiador", "leitor"]).default("leitor"),
});

const seedSchema = z.object({
  items: z.array(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().trim().min(1),
    projetoId: z.string().uuid(),
    papel: z.enum(["gestor", "financiador", "leitor"]).default("gestor"),
  })).min(1).max(50),
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6),
});

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1),
  projetoId: z.string().uuid(),
  papel: z.enum(["gestor", "financiador", "leitor"]),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Authorize: only super admins may create users.
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas Super Admins podem criar utilizadores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao obter ID do utilizador criado.");

    // Associa o utilizador ao projeto/programa indicado.
    const { error: memErr } = await supabaseAdmin
      .from("projeto_membros")
      .insert({ projeto_id: data.projetoId, user_id: userId, papel: data.papel });
    if (memErr) throw new Error(`Utilizador criado, mas falhou associação ao projeto: ${memErr.message}`);

    return { id: userId, email: created.user?.email };
  });

export const adminSeedGestores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => seedSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admins.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: Array<{ email: string; status: "created" | "exists" | "error"; message?: string }> = [];

    for (const it of data.items) {
      try {
        // Try create; if email exists, look up the user id.
        let userId: string | undefined;
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: it.email,
          password: it.password,
          email_confirm: true,
          user_metadata: { full_name: it.fullName },
        });
        let status: "created" | "exists" = "created";
        if (error) {
          // already registered
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = list?.users?.find((u) => u.email?.toLowerCase() === it.email.toLowerCase());
          if (!found) { results.push({ email: it.email, status: "error", message: error.message }); continue; }
          userId = found.id;
          status = "exists";
        } else {
          userId = created.user?.id;
        }
        if (!userId) { results.push({ email: it.email, status: "error", message: "sem user id" }); continue; }

        await supabaseAdmin
          .from("projeto_membros")
          .upsert({ projeto_id: it.projetoId, user_id: userId, papel: it.papel }, { onConflict: "projeto_id,user_id" });

        results.push({ email: it.email, status });
      } catch (e) {
        results.push({ email: it.email, status: "error", message: (e as Error).message });
      }
    }
    return { results };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admins.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);

    const ids = list.users.map((u) => u.id);
    const { data: membros } = await supabaseAdmin
      .from("projeto_membros")
      .select("user_id, papel, projeto_id, projetos(nome)")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const byUser = new Map<string, Array<{ projeto: string; papel: string }>>();
    for (const m of (membros ?? []) as any[]) {
      const arr = byUser.get(m.user_id) ?? [];
      arr.push({ projeto: m.projetos?.nome ?? "—", papel: m.papel });
      byUser.set(m.user_id, arr);
    }

    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: (u.user_metadata as any)?.full_name ?? "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      membros: byUser.get(u.id) ?? [],
    }));
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetPasswordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admins.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admins.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: { full_name: data.fullName },
    });
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId);

    // Substitui associações: remove anteriores e cria a nova.
    await supabaseAdmin.from("projeto_membros").delete().eq("user_id", data.userId);
    const { error: mErr } = await supabaseAdmin
      .from("projeto_membros")
      .insert({ user_id: data.userId, projeto_id: data.projetoId, papel: data.papel });
    if (mErr) throw new Error(mErr.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Apenas Super Admins.");
    if (data.userId === context.userId) throw new Error("Não pode eliminar a sua própria conta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

