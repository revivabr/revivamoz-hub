import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { assistenteAsk } from "@/lib/ai.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inteligencia")({
  head: () => ({
    meta: [
      { title: "Inteligência · Reviva Moz" },
      { name: "description", content: "Previsões, anomalias, resumo executivo e sugestões orçamentais." },
    ],
  }),
  component: InteligenciaPage,
});

type Lanc = {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  projeto_id: string;
};

import { linearRegression, predict } from "@/lib/stats/regression";
import { meanStddev } from "@/lib/stats/zscore";
import { ymKey, addMonths } from "@/lib/stats/month";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n);
}

function InteligenciaPage() {
  const [projetoId, setProjetoId] = useState<string>("");
  const ask = useServerFn(assistenteAsk);

  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome, tipo, orcamento")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const projeto = projetos.find((p) => p.id === projetoId);

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["lancs-inteligencia", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id, data, tipo, valor, descricao, categoria_id, projeto_id")
        .eq("projeto_id", projetoId)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Lanc[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-inteligencia", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome, tipo")
        .eq("projeto_id", projetoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { previsao, anomalias, sugestoes, kpis } = useMemo(() => {
    if (lancamentos.length === 0) {
      return { previsao: [] as Array<{ ym: string; valor: number; tipo: "histórico" | "previsto" }>, anomalias: [] as Lanc[], sugestoes: [] as string[], kpis: { entradas: 0, saidas: 0, saldo: 0 } };
    }

    // Agregação mensal de saldo líquido
    const mapa = new Map<string, { entradas: number; saidas: number }>();
    for (const l of lancamentos) {
      const k = ymKey(l.data);
      const cur = mapa.get(k) ?? { entradas: 0, saidas: 0 };
      if (l.tipo === "entrada") cur.entradas += Number(l.valor);
      else cur.saidas += Number(l.valor);
      mapa.set(k, cur);
    }
    const meses = Array.from(mapa.keys()).sort();
    const series = meses.map((ym, i) => ({
      ym,
      x: i,
      valor: (mapa.get(ym)?.entradas ?? 0) - (mapa.get(ym)?.saidas ?? 0),
      tipo: "histórico" as const,
    }));

    // Previsão linear próximos 3 meses
    const fit = linearRegression(series.map((s) => ({ x: s.x, y: s.valor })));
    const ultimoYm = meses[meses.length - 1];
    const futuros = [1, 2, 3].map((k) => ({
      ym: addMonths(ultimoYm, k),
      x: series.length - 1 + k,
      valor: predict(fit, series.length - 1 + k),
      tipo: "previsto" as const,
    }));
    const previsao = [...series.map(({ ym, valor, tipo }) => ({ ym, valor, tipo })), ...futuros.map(({ ym, valor, tipo }) => ({ ym, valor, tipo }))];

    // Anomalias: z-score em saídas
    const saidas = lancamentos.filter((l) => l.tipo === "saida");
    const { mean: media, stddev: desvio } = meanStddev(saidas.map((l) => Number(l.valor)));
    const anomalias = desvio > 0
      ? saidas.filter((l) => (Number(l.valor) - media) / desvio > 2).sort((x, y) => Number(y.valor) - Number(x.valor)).slice(0, 8)
      : [];

    // KPIs e sugestões
    const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
    const saidasTotal = saidas.reduce((s, l) => s + Number(l.valor), 0);
    const saldo = entradas - saidasTotal;

    const sugestoes: string[] = [];
    if (projeto?.orcamento) {
      const pct = (saidasTotal / Number(projeto.orcamento)) * 100;
      if (pct > 90) sugestoes.push(`⚠️ Já consumiu ${pct.toFixed(1)}% do orçamento. Considere congelar despesas não essenciais.`);
      else if (pct > 70) sugestoes.push(`Está em ${pct.toFixed(1)}% do orçamento. Reveja categorias com maior peso antes de novos compromissos.`);
    }
    // Top categorias de despesa
    const porCat = new Map<string, number>();
    for (const l of saidas) {
      if (!l.categoria_id) continue;
      porCat.set(l.categoria_id, (porCat.get(l.categoria_id) ?? 0) + Number(l.valor));
    }
    const top = Array.from(porCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [catId, valor] of top) {
      const nome = categorias.find((c) => c.id === catId)?.nome ?? "categoria";
      const pct = saidasTotal > 0 ? (valor / saidasTotal) * 100 : 0;
      if (pct > 35) sugestoes.push(`A categoria "${nome}" representa ${pct.toFixed(1)}% das despesas — avalie renegociar ou redistribuir.`);
    }
    if (fit.a < 0 && saldo > 0) sugestoes.push("Tendência de saldo mensal a descer. Reforce captação de doações ou reduza saídas recorrentes.");
    if (sugestoes.length === 0) sugestoes.push("Sem alertas relevantes. Continue a monitorizar o consumo mensal.");

    return { previsao, anomalias, sugestoes, kpis: { entradas, saidas: saidasTotal, saldo } };
  }, [lancamentos, categorias, projeto]);

  // Provedor para narrativa executiva
  const { data: provedores = [] } = useQuery({
    queryKey: ["ai-provedores-publico"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_ai_provedores_publico");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [resumo, setResumo] = useState<string>("");
  const resumoMut = useMutation({
    mutationFn: async () => {
      if (provedores.length === 0) throw new Error("Configure um provedor de IA primeiro.");
      const p = provedores[0];
      const question = `Gera um resumo executivo mensal (5-7 linhas, português de Moçambique) para o projeto "${projeto?.nome}". Saldo: ${fmt(kpis.saldo)} MZN. Entradas: ${fmt(kpis.entradas)} MZN. Saídas: ${fmt(kpis.saidas)} MZN. Orçamento: ${projeto?.orcamento ? fmt(Number(projeto.orcamento)) + " MZN" : "n/a"}. Anomalias detectadas: ${anomalias.length}. Sugestões internas: ${sugestoes.join(" | ")}. Termina com 2 recomendações concretas.`;
      const res = await ask({ data: {
        provedor: p.provedor as "openai" | "gemini" | "opencode_go",
        model: p.default_model,
        history: [],
        question,
      } });
      return res.content;
    },
    onSuccess: (txt) => setResumo(txt),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Inteligência">
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Selecione um projeto para analisar:</span>
              <Select value={projetoId} onValueChange={setProjetoId}>
                <SelectTrigger className="w-72"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!projetoId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Escolha um projeto acima.</CardContent></Card>
        ) : isLoading ? (
          <Card><CardContent className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent></Card>
        ) : lancamentos.length < 2 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Dados insuficientes para análise — registe mais lançamentos.</CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" /> Análise preditiva — saldo líquido mensal (próximos 3 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={previsao}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="ym" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--border)" />
                      <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--border)" tickFormatter={fmt} />
                      <Tooltip
                        formatter={(v: number) => `${fmt(v)} MZN`}
                        contentStyle={{ background: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "var(--card-foreground)", fontWeight: 600 }}
                        itemStyle={{ color: "var(--card-foreground)" }}
                      />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={(props) => {
                          const previsto = previsao[props.index!]?.tipo === "previsto";
                          return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={previsto ? "var(--muted-foreground)" : "var(--primary)"} stroke="none" />;
                        }}
                        strokeDasharray={undefined}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Pontos em cinzento representam previsão por regressão linear sobre o histórico.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Anomalias em despesas</CardTitle>
              </CardHeader>
              <CardContent>
                {anomalias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma anomalia detetada (z-score &gt; 2).</p>
                ) : (
                  <ul className="space-y-2">
                    {anomalias.map((l) => (
                      <li key={l.id} className="flex items-start justify-between gap-2 border-b pb-2 last:border-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm">{l.descricao || "(sem descrição)"}</div>
                          <div className="text-xs text-muted-foreground">{l.data}</div>
                        </div>
                        <Badge variant="destructive">{fmt(Number(l.valor))} MZN</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-yellow-500" /> Sugestões de optimização</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {sugestoes.map((s, i) => <li key={i} className="flex gap-2"><span>•</span><span>{s}</span></li>)}
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Resumo executivo mensal</CardTitle>
                  <Button size="sm" onClick={() => resumoMut.mutate()} disabled={resumoMut.isPending || provedores.length === 0}>
                    {resumoMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar com IA"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {provedores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Peça ao Super Admin para configurar um provedor de IA em Configurações → IA.</p>
                ) : resumo ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{resumo}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">Clique em "Gerar com IA" para produzir um resumo executivo baseado nos KPIs, anomalias e sugestões acima.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
