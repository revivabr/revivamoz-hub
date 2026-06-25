import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, Upload, FileText, AlertTriangle, Layers, Wallet,
  TrendingUp, TrendingDown, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProjetoLogo, ProjetoLogoUploader } from "@/components/projetos/ProjetoLogo";

export const Route = createFileRoute("/_authenticated/projetos/$projetoId")({
  head: () => ({
    meta: [
      { title: "Projeto · Reviva Moz" },
      { name: "description", content: "Painel financeiro individual de um projeto." },
    ],
  }),
  errorComponent: ({ error }) => (
    <DashboardLayout title="Projeto"><p className="text-sm text-destructive">{error.message}</p></DashboardLayout>
  ),
  notFoundComponent: () => (
    <DashboardLayout title="Projeto"><p className="text-sm text-muted-foreground">Projeto não encontrado.</p></DashboardLayout>
  ),
  component: ProjetoDashboard,
});

type Projeto = {
  id: string; nome: string; descricao: string | null;
  estado: "planeado" | "ativo" | "pausado" | "concluido" | "cancelado";
  orcamento: number; moeda: string;
  data_inicio: string | null; data_fim: string | null;
  logo_path: string | null;
};
type Categoria = { id: string; nome: string; tipo: "entrada" | "saida"; projeto_id: string | null };
type Etapa = {
  id: string; nome: string; descricao: string | null; ordem: number;
  peso: number; progresso: number; valor_previsto: number;
  data_inicio: string | null; data_fim: string | null;
};
type Lancamento = {
  id: string; tipo: "entrada" | "saida"; data: string;
  valor: number; descricao: string | null;
  categoria_id: string | null; etapa_id: string | null;
  comprovante_path: string | null; created_by: string;
};

function ProjetoDashboard() {
  const { projetoId } = Route.useParams();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", me?.id], enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: me!.id, _role: "super_admin" });
      return !!data;
    },
  });

  const { data: projeto, isLoading: loadingProj } = useQuery({
    queryKey: ["projeto", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id,nome,descricao,estado,orcamento,moeda,data_inicio,data_fim,logo_path")
        .eq("id", projetoId).maybeSingle();
      if (error) throw error;
      return data as Projeto | null;
    },
  });

  const { data: isGestor } = useQuery({
    queryKey: ["is-gestor-proj", projetoId, me?.id], enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_projeto_gestor", { _user_id: me!.id, _projeto_id: projetoId });
      return !!data || !!isSuperAdmin;
    },
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id,tipo,data,valor,descricao,categoria_id,etapa_id,comprovante_path,created_by")
        .eq("projeto_id", projetoId).order("data", { ascending: false });
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ["etapas", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas")
        .select("id,nome,descricao,ordem,peso,progresso,valor_previsto,data_inicio,data_fim")
        .eq("projeto_id", projetoId).order("ordem");
      if (error) throw error;
      return data as Etapa[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nome,tipo,projeto_id")
        .or(`projeto_id.is.null,projeto_id.eq.${projetoId}`)
        .order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const totals = useMemo(() => {
    const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
    const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
    const orc = Number(projeto?.orcamento ?? 0);
    const consumido = orc > 0 ? Math.min(100, (saidas / orc) * 100) : 0;
    const progressoFisico = etapas.length
      ? etapas.reduce((s, e) => s + (Number(e.peso) * Number(e.progresso)) / 100, 0) /
        Math.max(1, etapas.reduce((s, e) => s + Number(e.peso), 0)) * 100
      : 0;
    return { entradas, saidas, saldo: entradas - saidas, consumido, orc, progressoFisico };
  }, [lancamentos, projeto, etapas]);

  if (loadingProj) return <DashboardLayout title="…"><p className="text-sm text-muted-foreground">A carregar…</p></DashboardLayout>;
  if (!projeto) return <DashboardLayout title="Projeto"><p className="text-sm text-muted-foreground">Projeto não encontrado ou sem acesso.</p></DashboardLayout>;

  const fmt = (n: number) => `${Number(n).toLocaleString("pt-PT", { maximumFractionDigits: 2 })} ${projeto.moeda}`;
  const alertaTeto = totals.consumido >= 80;

  return (
    <DashboardLayout title={projeto.nome}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/subprojetos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos projetos
        </Link>
        <Badge variant="outline">{projeto.estado}</Badge>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entradas" value={fmt(totals.entradas)} icon={TrendingUp} tone="ok" />
        <KpiCard label="Saídas" value={fmt(totals.saidas)} icon={TrendingDown} tone="warn" />
        <KpiCard label="Saldo" value={fmt(totals.saldo)} icon={Wallet} tone={totals.saldo >= 0 ? "ok" : "danger"} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Orçamento consumido</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{totals.consumido.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">de {fmt(totals.orc)}</span>
            </div>
            <Progress value={totals.consumido} className="mt-2" />
            {alertaTeto && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> Atingiu {totals.consumido.toFixed(0)}% do orçamento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos" className="mt-6">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-4 space-y-4">
          {isGestor && (
            <NovoLancamento
              projetoId={projetoId}
              categorias={categorias}
              etapas={etapas}
              userId={me?.id ?? ""}
              onSaved={() => qc.invalidateQueries({ queryKey: ["lancamentos", projetoId] })}
            />
          )}
          <LancamentosLista
            lancamentos={lancamentos}
            categorias={categorias}
            etapas={etapas}
            moeda={projeto.moeda}
            canEdit={!!isGestor}
            projetoId={projetoId}
            onChanged={() => qc.invalidateQueries({ queryKey: ["lancamentos", projetoId] })}
          />
        </TabsContent>

        <TabsContent value="etapas" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Progresso físico</CardTitle>
                <CardDescription>Média ponderada das etapas: {totals.progressoFisico.toFixed(0)}%</CardDescription>
              </div>
            </CardHeader>
            <CardContent><Progress value={totals.progressoFisico} /></CardContent>
          </Card>
          <EtapasSection
            projetoId={projetoId}
            etapas={etapas}
            canEdit={!!isGestor}
            onChanged={() => qc.invalidateQueries({ queryKey: ["etapas", projetoId] })}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: "ok" | "warn" | "danger" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-destructive";
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent><span className={`text-2xl font-semibold ${color}`}>{value}</span></CardContent>
    </Card>
  );
}

// -------- Lançamentos --------
function NovoLancamento({
  projetoId, categorias, etapas, userId, onSaved,
}: {
  projetoId: string; categorias: Categoria[]; etapas: Etapa[]; userId: string; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    tipo: "saida" as "entrada" | "saida",
    data: new Date().toISOString().slice(0, 10),
    valor: "",
    descricao: "",
    categoria_id: "",
    etapa_id: "",
  });

  const mutate = useMutation({
    mutationFn: async () => {
      let comprovante_path: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `${projetoId}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("comprovantes").upload(path, file);
        if (error) throw error;
        comprovante_path = path;
      }
      const { error } = await supabase.from("lancamentos").insert({
        projeto_id: projetoId,
        tipo: form.tipo,
        data: form.data,
        valor: Number(form.valor) || 0,
        descricao: form.descricao.trim() || null,
        categoria_id: form.categoria_id || null,
        etapa_id: form.etapa_id || null,
        comprovante_path,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento registado.");
      setForm({ tipo: "saida", data: new Date().toISOString().slice(0, 10), valor: "", descricao: "", categoria_id: "", etapa_id: "" });
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catsFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Novo lançamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutate.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "entrada" | "saida", categoria_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input type="number" min="0" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {catsFiltradas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Etapa (opcional)</Label>
              <Select value={form.etapa_id} onValueChange={(v) => setForm({ ...form, etapa_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2"><Upload className="h-3 w-3" /> Comprovante (opcional)</Label>
            <Input ref={fileRef} type="file" accept="image/*,application/pdf" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutate.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LancamentosLista({
  lancamentos, categorias, etapas, moeda, canEdit, projetoId, onChanged,
}: {
  lancamentos: Lancamento[]; categorias: Categoria[]; etapas: Etapa[]; moeda: string;
  canEdit: boolean; projetoId: string; onChanged: () => void;
}) {
  const catMap = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.nome])), [categorias]);
  const etapaMap = useMemo(() => Object.fromEntries(etapas.map((e) => [e.id, e.nome])), [etapas]);

  const apagar = useMutation({
    mutationFn: async (l: Lancamento) => {
      if (l.comprovante_path) {
        await supabase.storage.from("comprovantes").remove([l.comprovante_path]);
      }
      const { error } = await supabase.from("lancamentos").delete().eq("id", l.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  if (!lancamentos.length) {
    return (
      <Card className="grid place-items-center py-10 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
        <CardTitle className="text-base">Ainda sem lançamentos</CardTitle>
        <CardDescription>Registe a primeira entrada ou saída.</CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {lancamentos.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={l.tipo === "entrada" ? "default" : "secondary"} className="capitalize">{l.tipo}</Badge>
                  <span className="truncate text-sm font-medium">{l.descricao || catMap[l.categoria_id ?? ""] || "Sem descrição"}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(l.data).toLocaleDateString("pt-PT")}
                  {l.categoria_id && ` · ${catMap[l.categoria_id]}`}
                  {l.etapa_id && ` · ${etapaMap[l.etapa_id]}`}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${l.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}>
                  {l.tipo === "entrada" ? "+" : "−"} {Number(l.valor).toLocaleString("pt-PT")} {moeda}
                </div>
                <div className="mt-1 flex items-center justify-end gap-1">
                  {l.comprovante_path && <ComprovantePreview path={l.comprovante_path} />}
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Apagar este lançamento?")) apagar.mutate(l); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <input type="hidden" data-projeto={projetoId} />
      </CardContent>
    </Card>
  );
}

function ComprovantePreview({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = path.toLowerCase().endsWith(".pdf");

  const openPreview = async () => {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    setUrl(data.signedUrl);
    setOpen(true);
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={openPreview} title="Ver comprovante">
        {isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Comprovante</DialogTitle></DialogHeader>
          {url && (isPdf ? (
            <iframe src={url} className="h-[70vh] w-full rounded-md border" />
          ) : (
            <img src={url} alt="Comprovante" className="max-h-[70vh] w-full rounded-md border object-contain" />
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------- Etapas --------
function EtapasSection({
  projetoId, etapas, canEdit, onChanged,
}: { projetoId: string; etapas: Etapa[]; canEdit: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", peso: "0", valor_previsto: "0", data_inicio: "", data_fim: "" });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("etapas").insert({
        projeto_id: projetoId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        peso: Number(form.peso) || 0,
        valor_previsto: Number(form.valor_previsto) || 0,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        ordem: etapas.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa criada.");
      setForm({ nome: "", descricao: "", peso: "0", valor_previsto: "0", data_inicio: "", data_fim: "" });
      setOpen(false);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarProgresso = useMutation({
    mutationFn: async ({ id, progresso }: { id: string; progresso: number }) => {
      const { error } = await supabase.from("etapas").update({ progresso }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("etapas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Etapas de obra</CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Nova etapa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova etapa</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
                <div className="space-y-1"><Label>Nome</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Peso (%)</Label><Input type="number" min="0" max="100" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Valor previsto</Label><Input type="number" min="0" step="0.01" value={form.valor_previsto} onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={criar.isPending}>Criar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem etapas.</p>
        ) : (
          etapas.map((e) => (
            <div key={e.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{e.nome}</div>
                  {e.descricao && <p className="text-xs text-muted-foreground">{e.descricao}</p>}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Peso {Number(e.peso)}%</span>
                    <span>Previsto {Number(e.valor_previsto).toLocaleString("pt-PT")}</span>
                  </div>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Apagar etapa "${e.nome}"?`)) apagar.mutate(e.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={Number(e.progresso)} className="flex-1" />
                {canEdit ? (
                  <Input
                    type="number" min={0} max={100} step={5}
                    defaultValue={Number(e.progresso)}
                    className="w-20"
                    onBlur={(ev) => {
                      const v = Math.max(0, Math.min(100, Number(ev.target.value)));
                      if (v !== Number(e.progresso)) atualizarProgresso.mutate({ id: e.id, progresso: v });
                    }}
                  />
                ) : (
                  <span className="w-12 text-right text-sm">{Number(e.progresso)}%</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
