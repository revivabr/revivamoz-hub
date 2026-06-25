import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Reviva Moz" },
      { name: "description", content: "Configurações do sistema Reviva Moz." },
      { property: "og:title", content: "Configurações · Reviva Moz" },
      { property: "og:description", content: "Configurações do sistema Reviva Moz." },
    ],
  }),
  component: SettingsPage,
});

type SuperAdminRow = { email: string; status: "active" | "pending" };

function SettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: isSuperAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "super_admin",
      });
      if (error) throw error;
      return !!data;
    },
  });

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ["super-admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_super_admins");
      if (error) throw error;
      return (data ?? []) as SuperAdminRow[];
    },
    enabled: !!isSuperAdmin,
  });

  const grantMutation = useMutation({
    mutationFn: async (target: string) => {
      const { data, error } = await supabase.rpc("grant_super_admin_by_email", { _email: target });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (status) => {
      toast.success(
        status === "granted"
          ? "Super Admin atribuído."
          : "E-mail registado — será promovido no primeiro login.",
      );
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc("revoke_super_admin_by_email", { _email: target });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Super Admin removido.");
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (checkingRole) {
    return (
      <DashboardLayout title={t("nav.settings")}>
        <p className="text-sm text-muted-foreground">A carregar…</p>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title={t("nav.settings")}>
        <EmptyState
          icon={Settings}
          title={t("empty.settings.title")}
          description={t("empty.settings.desc")}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("nav.settings")}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Super Administradores
          </CardTitle>
          <CardDescription>
            Os Super Admins têm acesso total a todos os projetos. Pode adicionar e-mails antes
            mesmo da conta existir — a promoção é aplicada automaticamente no primeiro login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const value = email.trim().toLowerCase();
              if (!value) return;
              grantMutation.mutate(value);
            }}
          >
            <Input
              type="email"
              required
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sm:max-w-sm"
            />
            <Button type="submit" disabled={grantMutation.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Super Admin
            </Button>
          </form>

          <div className="space-y-2">
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">A carregar lista…</p>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum Super Admin configurado.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {admins.map((row) => (
                  <li
                    key={row.email}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{row.email}</span>
                      <Badge
                        variant={row.status === "active" ? "default" : "secondary"}
                        className="mt-1 w-fit"
                      >
                        {row.status === "active" ? "Ativo" : "Pendente (1.º login)"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remover Super Admin de ${row.email}?`)) {
                          revokeMutation.mutate(row.email);
                        }
                      }}
                      disabled={revokeMutation.isPending}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
