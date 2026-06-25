import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, Link2, Copy, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · Reviva Moz" },
      { name: "description", content: "Relatórios financeiros por projeto e período, com exportação e partilha." },
    ],
  }),
  component: ReportsPage,
});

type Projeto = { id: string; nome: string; moeda: string; orcamento: number };
type Lanc = {
  id: string; data: string; tipo: "entrada" | "saida"; valor: number;
  descricao: string | null; categoria_id: string | null;
};
type Categoria = { id: string; nome: string };

function startOfMonthISO() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function ReportsPage() {
  const qc = useQueryClient();
  const [projetoId, setProjetoId] = useState<string>("");
  const [from, setFrom] = useState<string>(startOfMonthISO());
  const [to, setTo] = useState<string>(todayISO());
  const [expDays, setExpDays] = useState<number>(7);

  const { data: projetos = [] } = useQuery({
    queryKey: ["rel-projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos").select("id,nome,moeda,orcamento").order("nome");
      if (error) throw error;
      if (data?.length && !projetoId) setProjetoId(data[0].id);
      return data as Projeto[];
    },
  });

  const projeto = projetos.find((p) => p.id === projetoId);

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["rel-lanc", projetoId, from, to],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id,data,tipo,valor,descricao,categoria_id")
        .eq("projeto_id", projetoId)
        .gte("data", from).lte("data", to)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Lanc[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["rel-cats", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id,nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const catMap = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.nome])), [categorias]);

  const kpis = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const l of lancamentos) {
      if (l.tipo === "entrada") entradas += Number(l.valor);
      else saidas += Number(l.valor);
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [lancamentos]);

  function exportPDF() {
    if (!projeto) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(20, 83, 45);
    doc.text("Reviva Moz · Relatório Financeiro", 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Projeto: ${projeto.nome}`, 14, 28);
    doc.text(`Período: ${formatDate(from)} a ${formatDate(to)}`, 14, 34);
    doc.text(`Entradas: ${formatMZN(kpis.entradas)}   Saídas: ${formatMZN(kpis.saidas)}   Saldo: ${formatMZN(kpis.saldo)}`, 14, 40);

    autoTable(doc, {
      startY: 48,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor (MZN)"]],
      body: lancamentos.map((l) => [
        formatDate(l.data),
        l.tipo === "entrada" ? "Entrada" : "Saída",
        l.categoria_id ? catMap[l.categoria_id] ?? "—" : "—",
        l.descricao ?? "",
        Number(l.valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }),
      ]),
      headStyles: { fillColor: [20, 83, 45] },
      styles: { fontSize: 9 },
    });

    doc.save(`relatorio-${projeto.nome}-${from}-${to}.pdf`);
  }

  function exportExcel() {
    if (!projeto) return;
    const rows = lancamentos.map((l) => ({
      Data: l.data,
      Tipo: l.tipo,
      Categoria: l.categoria_id ? catMap[l.categoria_id] ?? "" : "",
      Descrição: l.descricao ?? "",
      Valor: Number(l.valor),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");

    const resumo = XLSX.utils.aoa_to_sheet([
      ["Reviva Moz · Relatório Financeiro"],
      ["Projeto", projeto.nome],
      ["Período", `${from} a ${to}`],
      [],
      ["Entradas", kpis.entradas],
      ["Saídas", kpis.saidas],
      ["Saldo", kpis.saldo],
    ]);
    XLSX.utils.book_append_sheet(wb, resumo, "Resumo");
    XLSX.writeFile(wb, `relatorio-${projeto.nome}-${from}-${to}.xlsx`);
  }

  // Partilhas
  const { data: shares = [] } = useQuery({
    queryKey: ["rel-shares", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorio_partilhas")
        .select("id,token,data_inicio,data_fim,expires_at,revoked,created_at")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createShare = useMutation({
    mutationFn: async () => {
      const me = (await supabase.auth.getUser()).data.user;
      if (!me) throw new Error("Sem sessão");
      const expires_at = new Date(Date.now() + expDays * 24 * 3600 * 1000).toISOString();
      const { error } = await supabase.from("relatorio_partilhas").insert({
        projeto_id: projetoId, data_inicio: from, data_fim: to,
        expires_at, created_by: me.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link criado"); qc.invalidateQueries({ queryKey: ["rel-shares", projetoId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("relatorio_partilhas")
        .update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link revogado"); qc.invalidateQueries({ queryKey: ["rel-shares", projetoId] }); },
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/p/relatorio/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros do relatório</CardTitle>
            <CardDescription>Escolha o projeto e o período a reportar.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Projeto</Label>
              <Select value={projetoId} onValueChange={setProjetoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
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
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Entradas</CardDescription>
            <CardTitle className="text-2xl text-primary">{formatMZN(kpis.entradas, { compact: true })}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Saídas</CardDescription>
            <CardTitle className="text-2xl text-destructive">{formatMZN(kpis.saidas, { compact: true })}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Saldo</CardDescription>
            <CardTitle className="text-2xl">{formatMZN(kpis.saldo, { compact: true })}</CardTitle></CardHeader></Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Lançamentos do período</CardTitle>
              <CardDescription>{lancamentos.length} registos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportPDF} disabled={!projeto}>
                <FileDown className="mr-1 h-4 w-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={exportExcel} disabled={!projeto}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lancamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos para os filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th className="text-right">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2">{formatDate(l.data)}</td>
                        <td><Badge variant={l.tipo === "entrada" ? "default" : "destructive"}>{l.tipo}</Badge></td>
                        <td>{l.categoria_id ? catMap[l.categoria_id] ?? "—" : "—"}</td>
                        <td className="max-w-xs truncate">{l.descricao}</td>
                        <td className="text-right font-medium">{formatMZN(Number(l.valor))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Share2 className="h-4 w-4" /> Partilha para o financiador</CardTitle>
            <CardDescription>Gere um link somente-leitura, com validade limitada, para enviar ao financiador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Validade (dias)</Label>
                <Input type="number" min={1} max={90} value={expDays}
                  onChange={(e) => setExpDays(Math.max(1, Number(e.target.value) || 1))} className="w-28" />
              </div>
              <Button onClick={() => createShare.mutate()} disabled={!projetoId || createShare.isPending}>
                <Link2 className="mr-1 h-4 w-4" /> Gerar link
              </Button>
            </div>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem partilhas ativas.</p>
            ) : (
              <ul className="divide-y text-sm">
                {shares.map((s) => {
                  const expirado = new Date(s.expires_at) < new Date();
                  const status = s.revoked ? "Revogado" : expirado ? "Expirado" : "Ativo";
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/relatorio/${s.token}`;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={status === "Ativo" ? "default" : "secondary"}>{status}</Badge>
                          <span className="text-xs text-muted-foreground">{s.data_inicio} → {s.data_fim} · expira {formatDate(s.expires_at)}</span>
                        </div>
                        <code className="mt-1 block truncate text-xs text-muted-foreground">{url}</code>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyLink(s.token)} disabled={s.revoked || expirado}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => revokeShare.mutate(s.id)} disabled={s.revoked}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
