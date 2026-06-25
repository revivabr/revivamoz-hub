import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus, Trash2, UserPlus, Users, Mail, Check } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/subprojetos")({
  head: () => ({
    meta: [
      { title: "Subprojetos · Reviva Moz" },
      { name: "description", content: "PEPEs e obras geridos pela Associação Reviva Moz." },
    ],
  }),
  component: SubprojectsPage,
});

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  estado: "planeado" | "ativo" | "pausado" | "concluido" | "cancelado";
  orcamento: number;
  moeda: string;
  data_inicio: string | null;
  data_fim: string | null;
  created_by: string;
};

type Membro = {
  id: string;
  user_id: string;
  papel: "gestor" | "financiador" | "leitor";
  profiles: { full_name: string | null } | null;
};

type Convite = {
  id: string;
  email: string;
  papel: "gestor" | "financiador" | "leitor";
  estado: "pendente" | "aceite" | "revogado";
  created_at: string;
};

const ESTADOS = ["planeado", "ativo", "pausado", "concluido", "cancelado"] as const;
const PAPEIS = ["gestor", "financiador", "leitor"] as const;

function SubprojectsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<Projeto | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: me!.id, _role: "super_admin",
      });
      if (error) throw error;
      return !!data;
    },
  });

  const { data: isGestorGlobal } = useQuery({
    queryKey: ["is-gestor", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: me!.id, _role: "gestor",
      });
      if (error) throw error;
      return !!data;
    },
  });

  const canCreate = !!isSuperAdmin || !!isGestorGlobal;

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id,nome,descricao,estado,orcamento,moeda,data_inicio,data_fim,created_by")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Projeto[];
    },
  });

  return (
    <DashboardLayout title={t("nav.subprojects")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Projetos</h2>
          <p className="text-sm text-muted-foreground">
            Cada projeto tem o seu próprio orçamento, equipa e financiadores.
          </p>
        </div>
        {canCreate && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo projeto</Button>
            </DialogTrigger>
            <CreateProjetoDialog
              onClose={() => setOpenCreate(false)}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ["projetos"] });
                setOpenCreate(false);
              }}
              userId={me?.id ?? ""}
            />
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : projetos.length === 0 ? (
        <Card className="grid place-items-center py-12 text-center">
          <FolderKanban className="mb-3 h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-base">Ainda sem projetos</CardTitle>
          <CardDescription className="max-w-sm">
            {canCreate
              ? "Crie o primeiro projeto e convide a sua equipa."
              : "Aguarde um convite de um gestor para começar a colaborar."}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projetos.map((p) => (
            <Card key={p.id} className="flex h-full flex-col transition hover:border-primary/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <EstadoBadge estado={p.estado} />
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {p.descricao || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-xs text-muted-foreground">
                Orçamento: <span className="font-medium text-foreground">
                  {Number(p.orcamento).toLocaleString("pt-PT")} {p.moeda}
                </span>
              </CardContent>
              <div className="flex items-center justify-between gap-2 border-t p-3">
                <Button asChild size="sm" variant="default">
                  <Link to="/projetos/$projetoId" params={{ projetoId: p.id }}>Abrir painel</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(p)}>
                  <Users className="mr-1 h-4 w-4" />Membros
                </Button>
              </div>
            </Card>
          ))}
        </div>

      )}

      <ConvitesParaMim />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <ProjetoDetailDialog
            projeto={selected}
            currentUserId={me?.id ?? ""}
            isSuperAdmin={!!isSuperAdmin}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </DashboardLayout>
  );
}

function EstadoBadge({ estado }: { estado: Projeto["estado"] }) {
  const map: Record<Projeto["estado"], string> = {
    planeado: "secondary", ativo: "default", pausado: "outline",
    concluido: "secondary", cancelado: "destructive",
  };
  return <Badge variant={map[estado] as never}>{estado}</Badge>;
}

function CreateProjetoDialog({
  onClose, onCreated, userId,
}: { onClose: () => void; onCreated: () => void; userId: string }) {
  const [form, setForm] = useState({
    nome: "", descricao: "", estado: "planeado" as Projeto["estado"],
    orcamento: "0", moeda: "MZN",
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const { data: projeto, error } = await supabase
        .from("projetos")
        .insert({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          estado: form.estado,
          orcamento: Number(form.orcamento) || 0,
          moeda: form.moeda,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Auto-adicionar o criador como gestor do projeto.
      const { error: memErr } = await supabase
        .from("projeto_membros")
        .insert({ projeto_id: projeto.id, user_id: userId, papel: "gestor" });
      if (memErr) throw memErr;
    },
    onSuccess: () => { toast.success("Projeto criado."); onCreated(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo projeto</DialogTitle>
        <DialogDescription>O criador entra automaticamente como Gestor.</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      >
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as Projeto["estado"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Orçamento</Label>
            <Input type="number" min="0" step="0.01" value={form.orcamento} onChange={(e) => setForm({ ...form, orcamento: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Moeda</Label>
            <Input value={form.moeda} onChange={(e) => setForm({ ...form, moeda: e.target.value.toUpperCase() })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>Criar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ProjetoDetailDialog({
  projeto, currentUserId, isSuperAdmin, onClose,
}: {
  projeto: Projeto; currentUserId: string; isSuperAdmin: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePapel, setInvitePapel] = useState<Membro["papel"]>("financiador");

  const { data: membros = [] } = useQuery({
    queryKey: ["membros", projeto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_membros")
        .select("id,user_id,papel, profiles:profiles!projeto_membros_user_id_fkey(full_name)")
        .eq("projeto_id", projeto.id);
      if (error) throw error;
      return data as unknown as Membro[];
    },
  });

  const isGestor = useMemo(
    () => isSuperAdmin || membros.some((m) => m.user_id === currentUserId && m.papel === "gestor"),
    [membros, currentUserId, isSuperAdmin],
  );

  const { data: convites = [] } = useQuery({
    queryKey: ["convites", projeto.id],
    enabled: isGestor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_convites")
        .select("id,email,papel,estado,created_at")
        .eq("projeto_id", projeto.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Convite[];
    },
  });

  const invitar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projeto_convites").insert({
        projeto_id: projeto.id,
        email: inviteEmail.trim().toLowerCase(),
        papel: invitePapel,
        convidado_por: currentUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite criado.");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["convites", projeto.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revogarConvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projeto_convites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["convites", projeto.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removerMembro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projeto_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros", projeto.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const apagarProjeto = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projetos").delete().eq("id", projeto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto apagado.");
      qc.invalidateQueries({ queryKey: ["projetos"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {projeto.nome} <EstadoBadge estado={projeto.estado} />
        </DialogTitle>
        <DialogDescription>{projeto.descricao || "Sem descrição."}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Membros ({membros.length})
          </h3>
          <ul className="divide-y rounded-md border text-sm">
            {membros.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <div className="font-medium">{m.profiles?.full_name || "Sem nome"}</div>
                  <Badge variant="outline" className="mt-1">{m.papel}</Badge>
                </div>
                {isGestor && m.user_id !== currentUserId && (
                  <Button size="icon" variant="ghost" onClick={() => removerMembro.mutate(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isGestor && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4" /> Convites
            </h3>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => { e.preventDefault(); if (inviteEmail.trim()) invitar.mutate(); }}
            >
              <Input
                type="email" required placeholder="email@exemplo.com"
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select value={invitePapel} onValueChange={(v) => setInvitePapel(v as Membro["papel"])}>
                <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPEIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={invitar.isPending}>
                <UserPlus className="mr-2 h-4 w-4" />Convidar
              </Button>
            </form>
            {convites.length > 0 && (
              <ul className="mt-3 divide-y rounded-md border text-sm">
                {convites.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="font-medium">{c.email}</div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{c.papel}</Badge>
                        <Badge variant={c.estado === "aceite" ? "default" : "secondary"}>
                          {c.estado}
                        </Badge>
                      </div>
                    </div>
                    {c.estado === "pendente" && (
                      <Button size="icon" variant="ghost" onClick={() => revogarConvite.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <DialogFooter className="justify-between sm:justify-between">
        {isSuperAdmin ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Apagar definitivamente o projeto "${projeto.nome}"?`)) apagarProjeto.mutate();
            }}
            disabled={apagarProjeto.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />Apagar projeto
          </Button>
        ) : <span />}
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ConvitesParaMim() {
  const qc = useQueryClient();
  const { data: convites = [] } = useQuery({
    queryKey: ["meus-convites"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) return [];
      const { data, error } = await supabase
        .from("projeto_convites")
        .select("id,email,papel,estado,created_at, projetos:projetos(nome)")
        .eq("estado", "pendente")
        .ilike("email", email);
      if (error) throw error;
      return data as Array<Convite & { projetos: { nome: string } | null }>;
    },
  });

  const aceitar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("accept_projeto_convite", { _convite_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite aceite. Bem-vindo ao projeto!");
      qc.invalidateQueries({ queryKey: ["meus-convites"] });
      qc.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (convites.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />Convites pendentes para si
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border text-sm">
          {convites.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium">{c.projetos?.nome ?? "Projeto"}</div>
                <Badge variant="outline" className="mt-1">{c.papel}</Badge>
              </div>
              <Button size="sm" onClick={() => aceitar.mutate(c.id)} disabled={aceitar.isPending}>
                <Check className="mr-2 h-4 w-4" />Aceitar
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
