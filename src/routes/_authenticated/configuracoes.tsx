import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, Trash2, UserPlus, KeyRound } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminSeedGestores, adminListUsers, adminResetPassword } from "@/lib/admin-users.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AiProvedoresCard } from "@/components/configuracoes/AiProvedoresCard";
import { Mail } from "lucide-react";
import { testBrevoEmail } from "@/lib/notifications.functions";


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
      <div className="space-y-6">
      <CreateUserCard />
      <SeedGestoresCard />
      <BrevoTestCard />
      <AiProvedoresCard />
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
      </div>
    </DashboardLayout>
  );
}

function CreateUserCard() {
  const createUser = useServerFn(adminCreateUser);
  const [form, setForm] = useState({
    fullName: "", email: "", password: "",
    projetoId: "", papel: "leitor" as "gestor" | "financiador" | "leitor",
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id,nome,tipo")
        .order("nome");
      if (error) throw error;
      return data as Array<{ id: string; nome: string; tipo: string }>;
    },
  });

  const mutation = useMutation({
    mutationFn: () => createUser({ data: form }),
    onSuccess: () => {
      toast.success("Utilizador criado e associado ao projeto.");
      setForm({ fullName: "", email: "", password: "", projetoId: "", papel: "leitor" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Criar utilizador
        </CardTitle>
        <CardDescription>
          Emita credenciais e associe imediatamente o utilizador ao projeto/programa a que terá
          acesso restrito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.projetoId) { toast.error("Seleccione um projeto."); return; }
            mutation.mutate();
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Nome completo</Label>
            <Input required value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Palavra-passe inicial</Label>
            <Input type="text" minLength={8} required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Projeto / Programa</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.projetoId}
              onChange={(e) => setForm({ ...form, projetoId: e.target.value })}
            >
              <option value="">— Seleccionar —</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Papel no projeto</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.papel}
              onChange={(e) => setForm({ ...form, papel: e.target.value as typeof form.papel })}
            >
              <option value="leitor">Leitor (só consulta)</option>
              <option value="financiador">Financiador</option>
              <option value="gestor">Gestor</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar utilizador
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BrevoTestCard() {
  const send = useServerFn(testBrevoEmail);
  const [to, setTo] = useState("");
  const m = useMutation({
    mutationFn: () => send({ data: { to } }),
    onSuccess: () => toast.success("E-mail de teste enviado."),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> Notificações por e-mail (Brevo)
        </CardTitle>
        <CardDescription>
          Envie um e-mail de teste para confirmar que a integração está operacional. Remetente:
          <code className="ml-1">info-noreplay@revivamoz.com</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); if (to) m.mutate(); }}
        >
          <Input type="email" required placeholder="destinatario@exemplo.com"
            value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-sm" />
          <Button type="submit" disabled={m.isPending}>
            <Mail className="mr-2 h-4 w-4" /> Enviar teste
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const SEED_ITEMS = [
  { email: "pepereviva@revivamoz.com",  password: "peprev123", fullName: "Gestor PEPE Reviva",  projetoId: "43b4aae2-aba5-466b-9b18-3edb8be161a2" },
  { email: "pepenahene@revivamoz.com",  password: "nah123",    fullName: "Gestor PEPE Nahene",  projetoId: "110d84f8-13d2-47e9-8a77-e74134055d56" },
  { email: "pepeyeshua@revivamoz.com",  password: "yes123",    fullName: "Gestor PEPE Yeshua",  projetoId: "5db36508-3d1f-437e-9150-20162a98be09" },
  { email: "pepeemunah@revivamoz.com",  password: "emu123",    fullName: "Gestor PEPE Emunah",  projetoId: "17c5f11d-997c-4b1b-bd3b-7ae122fe365a" },
  { email: "pepehope@revivamoz.com",    password: "hop123",    fullName: "Gestor PEPE Hope",    projetoId: "7ea26993-b6da-415a-8ac0-37bd33cda7ea" },
  { email: "tbe@revivamoz.com",         password: "tbe123",    fullName: "Gestor TBE",          projetoId: "f3b7cb21-3b5d-4bce-ad5e-e39be65a4c29" },
  { email: "ginasio@revivamoz.com",     password: "gin123",    fullName: "Gestor Ginásio",      projetoId: "d91ba1f2-ae76-48e2-8700-3e7ceb2fcbf9" },
  { email: "base@revivamoz.com",        password: "bas123",    fullName: "Gestor Base Missionária", projetoId: "08e1b255-8d37-4325-95a7-af018c50c1a6" },
  { email: "basculante@revivamoz.com",  password: "bas123",    fullName: "Gestor Caminhão Basculante", projetoId: "b22ea081-a26b-4760-bd27-584d2b172119" },
  { email: "tanque@revivamoz.com",      password: "tan123",    fullName: "Gestor Caminhão Tanque", projetoId: "7b9f996f-5dc6-4e57-a170-f27e0817f8fe" },
  { email: "sustenta@revivamoz.com",    password: "sus123",    fullName: "Gestor Sustentabilidade", projetoId: "1713b9d3-a2d1-4c45-8dc9-bacea8544608" },
  { email: "adm@revivamoz.com",         password: "adm123",    fullName: "Gestor Administração Geral", projetoId: "e4a46d4b-2e7a-4831-9d23-0bb8c6eb4584" },
  { email: "cen@revivamoz.com",         password: "cen123",    fullName: "Gestor CEN Comunidade", projetoId: "6faf19cb-c65d-46da-ac88-da694369e708" },
] as const;

function SeedGestoresCard() {
  const seed = useServerFn(adminSeedGestores);
  const [results, setResults] = useState<Array<{ email: string; status: string; message?: string }>>([]);
  const run = useMutation({
    mutationFn: () => seed({ data: { items: SEED_ITEMS.map((i) => ({ ...i, papel: "gestor" as const })) } }),
    onSuccess: (r: any) => { setResults(r.results ?? []); toast.success("Seed concluído."); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Seed Gestores Iniciais</CardTitle>
        <CardDescription>
          Cria os 13 utilizadores gestores predefinidos (um por projeto). Idempotente: contas já existentes são apenas associadas ao projeto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "A executar..." : "Executar seed"}
        </Button>
        {results.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {results.map((r) => (
              <li key={r.email} className="flex items-center justify-between px-3 py-2">
                <span className="font-mono text-xs">{r.email}</span>
                <Badge variant={r.status === "error" ? "destructive" : r.status === "created" ? "default" : "secondary"}>
                  {r.status}{r.message ? ` · ${r.message}` : ""}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}



