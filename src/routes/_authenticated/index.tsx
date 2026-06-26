import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, TrendingUp, TrendingDown, FolderKanban, Filter, Activity } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CategoriaPies } from "@/components/projetos/CategoriaPies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatMZN } from "@/lib/format";
import {
  chartColors, categoricalPalette, tooltipContentStyle, tooltipLabelStyle,
  tooltipItemStyle, axisTickStyle, gridStroke, legendStyle,
} from "@/lib/chart-theme";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Visão Global · Reviva Moz" },
      { name: "description", content: "Painel consolidado em tempo real: KPIs, comparativos, categorias e saúde financeira." },
    ],
  }),
  component: DashboardPage,
});

type Projeto = {
  id: string; nome: string; tipo: "programa_social" | "projeto_sazonal" | "caixa_administrativo";
  estado: string; orcamento: number; moeda: string;
};
type Lancamento = {
  id: string; projeto_id: string; tipo: "entrada" | "saida";
  valor: number; data: string; descricao: string | null;
  categoria_id: string | null;
};
type Categoria = { id: string; nome: string };

function startOfYearISO() {
  const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

const DEFAULT_PROJETO_NAME = "Reviva-Moz Adm Geral";

function DashboardPage() {
  const { t, locale } = useI18n();
  const [projetoId, setProjetoId] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("all");
  const [from, setFrom] = useState<string>(startOfYearISO());
  const [to, setTo] = useState<string>(todayISO());
  const [defaultApplied, setDefaultApplied] = useState(false);

  const { data: projetos = [] } = useQuery({
    queryKey: ["dash-projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id,nome,tipo,estado,orcamento,moeda")
        .order("nome");
      if (error) throw error;
      return data as Projeto[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["dash-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id,nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  // Aplicar projeto padrão (Reviva-Moz Adm Geral) na primeira carga
  useEffect(() => {
    if (defaultApplied || projetos.length === 0) return;
    const def = projetos.find((p) => p.nome === DEFAULT_PROJETO_NAME);
    if (def) setProjetoId(def.id);
    setDefaultApplied(true);
  }, [projetos, defaultApplied]);

  const projetosFiltrados = useMemo(() => projetos.filter((p) =>
    (tipo === "all" || p.tipo === tipo) &&
    (projetoId === "all" || p.id === projetoId)
  ), [projetos, tipo, projetoId]);

  const projetosIds = projetosFiltrados.map((p) => p.id);

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["dash-lanc", projetosIds.join(","), from, to],
    enabled: projetosIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id,projeto_id,tipo,valor,data,descricao,categoria_id")
        .in("projeto_id", projetosIds)
        .gte("data", from).lte("data", to)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  const kpis = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const l of lancamentos) {
      if (l.tipo === "entrada") entradas += Number(l.valor);
      else saidas += Number(l.valor);
    }
    const ativos = projetosFiltrados.filter((p) => p.estado === "ativo").length;
    return { entradas, saidas, saldo: entradas - saidas, ativos };
  }, [lancamentos, projetosFiltrados]);

  const porProjeto = useMemo(() => {
    const map = new Map<string, { nome: string; entradas: number; saidas: number; orcamento: number }>();
    for (const p of projetosFiltrados) {
      map.set(p.id, { nome: p.nome, entradas: 0, saidas: 0, orcamento: Number(p.orcamento) });
    }
    for (const l of lancamentos) {
      const row = map.get(l.projeto_id);
      if (!row) continue;
      if (l.tipo === "entrada") row.entradas += Number(l.valor);
      else row.saidas += Number(l.valor);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [projetosFiltrados, lancamentos]);

  // Evolução mensal (entradas / saídas / saldo acumulado)
  const evolucao = useMemo(() => {
    const months = new Map<string, { mes: string; entradas: number; saidas: number }>();
    for (const l of lancamentos) {
      const k = l.data.slice(0, 7);
      const row = months.get(k) ?? { mes: k, entradas: 0, saidas: 0 };
      if (l.tipo === "entrada") row.entradas += Number(l.valor);
      else row.saidas += Number(l.valor);
      months.set(k, row);
    }
    const ordered = Array.from(months.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    let acc = 0;
    return ordered.map((r) => {
      acc += r.entradas - r.saidas;
      return { ...r, saldo: acc };
    });
  }, [lancamentos]);

  // Top 5 categorias de saída
  const topSaidas = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lancamentos) {
      if (l.tipo !== "saida") continue;
      const k = l.categoria_id ?? "__none__";
      map.set(k, (map.get(k) ?? 0) + Number(l.valor));
    }
    const nameOf = (id: string) =>
      id === "__none__" ? "Sem categoria" : categorias.find((c) => c.id === id)?.nome ?? "Outros";
    return Array.from(map.entries())
      .map(([id, valor]) => ({ nome: nameOf(id), valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [lancamentos, categorias]);

  const fmt = (v: number) => formatMZN(v, { locale });

  return (
    <DashboardLayout title={t("nav.overview")}>
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
            <CardDescription>Os dados, gráficos e KPIs atualizam em tempo real conforme os filtros.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Projeto</Label>
              <Select value={projetoId} onValueChange={setProjetoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="programa_social">Programa Social</SelectItem>
                  <SelectItem value="projeto_sazonal">Projeto Sazonal</SelectItem>
                  <SelectItem value="caixa_administrativo">Caixa Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-in">
          <KpiCard title={t("kpi.global_balance")} value={formatMZN(kpis.saldo, { compact: true, locale })}
            hint={t("kpi.updated_now")} icon={PiggyBank} accent="primary" />
          <KpiCard title={t("kpi.revenue")} value={formatMZN(kpis.entradas, { compact: true, locale })}
            hint={`${from} → ${to}`} icon={TrendingUp} accent="success" />
          <KpiCard title={t("kpi.expenses")} value={formatMZN(kpis.saidas, { compact: true, locale })}
            hint={`${from} → ${to}`} icon={TrendingDown} accent="destructive" />
          <KpiCard title={t("kpi.active_projects")} value={String(kpis.ativos)}
            hint={`${projetosFiltrados.length} no filtro`} icon={FolderKanban} accent="accent" />
        </section>

        <CategoriaPies lancamentos={lancamentos} categorias={categorias} fmt={fmt} />

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Evolução mensal
            </CardTitle>
            <CardDescription>Entradas, saídas e saldo acumulado no período.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {evolucao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para os filtros atuais.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSai" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.destructive} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={chartColors.destructive} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="mes" tick={axisTickStyle} stroke={gridStroke} />
                  <YAxis tick={axisTickStyle} stroke={gridStroke} />
                  <Tooltip
                    formatter={(v: number) => fmt(Number(v))}
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ stroke: chartColors.muted, strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Area type="monotone" dataKey="entradas" name="Entradas"
                    stroke={chartColors.primary} strokeWidth={2} fill="url(#gEnt)" isAnimationActive animationDuration={700} />
                  <Area type="monotone" dataKey="saidas" name="Saídas"
                    stroke={chartColors.destructive} strokeWidth={2} fill="url(#gSai)" isAnimationActive animationDuration={700} />
                  <Area type="monotone" dataKey="saldo" name="Saldo acumulado"
                    stroke={categoricalPalette[2]} strokeWidth={2} fillOpacity={0} isAnimationActive animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base">Comparativo por projeto</CardTitle>
              <CardDescription>Entradas vs saídas no período.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {porProjeto.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados para os filtros atuais.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porProjeto}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="nome" tick={axisTickStyle} stroke={gridStroke} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={axisTickStyle} stroke={gridStroke} />
                    <Tooltip
                      formatter={(v: number) => fmt(Number(v))}
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    <Bar dataKey="entradas" fill={chartColors.primary} name="Entradas" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} />
                    <Bar dataKey="saidas" fill={chartColors.destructive} name="Saídas" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base">Top 5 saídas por categoria</CardTitle>
              <CardDescription>Onde a organização mais gasta no período.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {topSaidas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem saídas no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSaidas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" tick={axisTickStyle} stroke={gridStroke} />
                    <YAxis dataKey="nome" type="category" tick={axisTickStyle} stroke={gridStroke} width={120} />
                    <Tooltip
                      formatter={(v: number) => fmt(Number(v))}
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar dataKey="valor" name="Saídas" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700}>
                      {topSaidas.map((_, i) => (
                        <Cell key={i} fill={categoricalPalette[i % categoricalPalette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>


        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Saúde financeira por projeto</CardTitle>
            <CardDescription>Semáforo baseado em saídas vs orçamento. Clique para drill-down.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {porProjeto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem projetos no filtro.</p>
            ) : porProjeto.map((p) => {
              const ratio = p.orcamento > 0 ? p.saidas / p.orcamento : 0;
              const status = ratio >= 1 ? "critico" : ratio >= 0.8 ? "alerta" : "saudavel";
              const color = status === "critico" ? "destructive" : status === "alerta" ? "secondary" : "default";
              const label = status === "critico" ? "Excedido" : status === "alerta" ? "Atenção" : "Saudável";
              return (
                <Link key={p.id} to="/projetos/$projetoId" params={{ projetoId: p.id }}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition hover:border-primary/60">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.nome}</span>
                      <Badge variant={color as never}>{label}</Badge>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
                      <div className={`h-full ${status === "critico" ? "bg-destructive" : status === "alerta" ? "bg-yellow-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{formatMZN(p.saidas, { compact: true, locale })} / {formatMZN(p.orcamento, { compact: true, locale })}</div>
                    <div>{Math.round(ratio * 100)}%</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Últimas transações</CardTitle>
            <CardDescription>Drill-down: clique para abrir o painel do projeto.</CardDescription>
          </CardHeader>
          <CardContent>
            {lancamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos no período.</p>
            ) : (
              <ul className="divide-y text-sm">
                {lancamentos.slice(0, 15).map((l) => {
                  const p = projetos.find((x) => x.id === l.projeto_id);
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <Link to="/projetos/$projetoId" params={{ projetoId: l.projeto_id }}
                          className="font-medium hover:underline">{p?.nome ?? "—"}</Link>
                        <div className="truncate text-xs text-muted-foreground">{l.descricao || "Sem descrição"} · {l.data}</div>
                      </div>
                      <Badge variant={l.tipo === "entrada" ? "default" : "destructive"}>
                        {l.tipo === "entrada" ? "+" : "−"} {formatMZN(Number(l.valor), { compact: true, locale })}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
