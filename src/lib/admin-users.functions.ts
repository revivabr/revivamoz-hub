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
