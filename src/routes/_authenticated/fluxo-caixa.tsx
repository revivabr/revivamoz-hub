import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingDown, TrendingUp, Printer, FileDown, FileSpreadsheet, Share2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMZN, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa · Reviva Moz" },
      { name: "description", content: "Lançamentos e movimentos financeiros de todos os projetos." },
    ],
  }),
  component: CashflowPage,
});

type Row = {
  id: string;
  projeto_id: string;
  tipo: "entrada" | "saida";
  data: string;
  valor: number;
  descricao: string | null;
  projetos: { nome: string; moeda: string } | null;
};

function startOfMonthISO() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function CashflowPage() {
  const { t } = useI18n();
  const [projetoId, setProjetoId] = useState<string>("all");
  const [from, setFrom] = useState<string>(startOfMonthISO());
  const [to, setTo] = useState<string>(todayISO());

  const { data: projetos = [] } = useQuery({
    queryKey: ["fc-projetos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select("id,nome").order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lancamentos-all", projetoId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("lancamentos")
        .select("id,projeto_id,tipo,data,valor,descricao, projetos:projetos(nome,moeda)")
        .gte("data", from).lte("data", to)
        .order("data", { ascending: false })
        .limit(1000);
      if (projetoId !== "all") q = q.eq("projeto_id", projetoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const totais = useMemo(() => {
    const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
    const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const projetoNome = projetoId === "all" ? "Todos os projetos" : projetos.find((p) => p.id === projetoId)?.nome ?? "—";

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(20, 83, 45);
    doc.text("Reviva Moz · Fluxo de Caixa", 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Projeto: ${projetoNome}`, 14, 28);
    doc.text(`Período: ${formatDate(from)} a ${formatDate(to)}`, 14, 34);
    doc.text(`Entradas: ${formatMZN(totais.entradas)}   Saídas: ${formatMZN(totais.saidas)}   Saldo: ${formatMZN(totais.saldo)}`, 14, 40);
    autoTable(doc, {
      startY: 48,
      head: [["Data", "Projeto", "Tipo", "Descrição", "Valor (MZN)"]],
      body: rows.map((r) => [
        formatDate(r.data),
        r.projetos?.nome ?? "—",
        r.tipo === "entrada" ? "Entrada" : "Saída",
        r.descricao ?? "",
        Number(r.valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }),
      ]),
      headStyles: { fillColor: [20, 83, 45] },
      styles: { fontSize: 9 },
    });
    doc.save(`fluxo-caixa-${from}-${to}.pdf`);
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Data: r.data,
      Projeto: r.projetos?.nome ?? "",
      Tipo: r.tipo,
      Descrição: r.descricao ?? "",
      Valor: Number(r.valor),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    const resumo = XLSX.utils.aoa_to_sheet([
      ["Reviva Moz · Fluxo de Caixa"],
      ["Projeto", projetoNome],
      ["Período", `${from} a ${to}`],
      [],
      ["Entradas", totais.entradas],
      ["Saídas", totais.saidas],
      ["Saldo", totais.saldo],
    ]);
    XLSX.utils.book_append_sheet(wb, resumo, "Resumo");
    XLSX.writeFile(wb, `fluxo-caixa-${from}-${to}.xlsx`);
  }

  async function share() {
    const url = window.location.href;
    const title = `Fluxo de Caixa · ${projetoNome}`;
    const text = `${title} · ${formatDate(from)} a ${formatDate(to)} · Saldo ${formatMZN(totais.saldo)}`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <DashboardLayout title={t("nav.cashflow")}>
      <div className="space-y-4 print:space-y-2">
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Visualização somente-leitura. Edição é feita pelos gestores em cada projeto.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="space-y-1 sm:col-span-2">
              <Label>Projeto</Label>
              <Select value={projetoId} onValueChange={setProjetoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
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
            <div className="flex flex-wrap items-end gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Imprimir</Button>
              <Button size="sm" variant="outline" onClick={exportPDF}><FileDown className="mr-1 h-4 w-4" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={share}><Share2 className="mr-1 h-4 w-4" /> Partilhar</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} title={t("empty.cashflow.title")} description={t("empty.cashflow.desc")} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi label="Entradas" value={totais.entradas} icon={TrendingUp} tone="ok" />
              <Kpi label="Saídas" value={totais.saidas} icon={TrendingDown} tone="warn" />
              <Kpi label="Saldo" value={totais.saldo} icon={Wallet} tone={totais.saldo >= 0 ? "ok" : "danger"} />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lançamentos · {projetoNome}</CardTitle>
                <CardDescription>{rows.length} registos · {formatDate(from)} a {formatDate(to)}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={r.tipo === "entrada" ? "default" : "secondary"} className="capitalize">{r.tipo}</Badge>
                          <span className="truncate text-sm font-medium">{r.descricao || "—"}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(r.data).toLocaleDateString("pt-PT")} ·{" "}
                          <Button asChild variant="link" className="h-auto p-0 text-xs">
                            <Link to="/projetos/$projetoId" params={{ projetoId: r.projeto_id }}>{r.projetos?.nome ?? "Projeto"}</Link>
                          </Button>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${r.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}>
                        {r.tipo === "entrada" ? "+" : "−"} {Number(r.valor).toLocaleString("pt-PT")} {r.projetos?.moeda ?? ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Kpi({ label, value, icon: Icon, tone }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  tone: "ok" | "warn" | "danger";
}) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-destructive";
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <span className={`text-2xl font-semibold ${color}`}>{value.toLocaleString("pt-PT")} MZN</span>
      </CardContent>
    </Card>
  );
}
