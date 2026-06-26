import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { drawReportHeader } from "@/lib/pdf-header";
import { formatMZN, formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/p/relatorio/$token")({
  head: () => ({
    meta: [
      { title: "Relatório partilhado · Reviva Moz" },
      { name: "description", content: "Relatório financeiro partilhado, somente-leitura." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicReport,
});

type Payload = {
  projeto: { nome: string; descricao: string | null; moeda: string; orcamento: number; tipo: string };
  periodo: { inicio: string; fim: string };
  expires_at: string;
  kpis: { entradas: number; saidas: number };
  lancamentos: Array<{ id: string; data: string; tipo: "entrada" | "saida"; valor: number; descricao: string | null; categoria: string | null }>;
};

function PublicReport() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pub-rel", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relatorio_publico", { _token: token });
      if (error) throw error;
      return data as Payload | null;
    },
  });

  if (isLoading) return <Centered>A carregar relatório…</Centered>;
  if (error) return <Centered>Erro ao carregar.</Centered>;
  if (!data) return <Centered>Este link é inválido, foi revogado ou expirou.</Centered>;

  const saldo = Number(data.kpis.entradas) - Number(data.kpis.saidas);

  async function exportPDF() {
    if (!data) return;
    const doc = new jsPDF();
    const startY = await drawReportHeader(doc, {
      title: "Relatório Financeiro",
      subtitleLines: [
        data.projeto.nome,
        `Período: ${formatDate(data.periodo.inicio)} a ${formatDate(data.periodo.fim)}`,
      ],
      projetoLogoPath: (data.projeto as { logo_path?: string | null }).logo_path ?? null,
    });
    doc.setFontSize(10); doc.setTextColor(40);
    doc.text(
      `Entradas: ${formatMZN(Number(data.kpis.entradas))}    Saídas: ${formatMZN(Number(data.kpis.saidas))}    Saldo: ${formatMZN(saldo)}`,
      doc.internal.pageSize.getWidth() / 2, startY, { align: "center" },
    );
    autoTable(doc, {
      startY: startY + 6,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor (MZN)"]],
      body: data.lancamentos.map((l) => [
        formatDate(l.data), l.tipo === "entrada" ? "Entrada" : "Saída",
        l.categoria ?? "—", l.descricao ?? "",
        Number(l.valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }),
      ]),
      headStyles: { fillColor: [20, 83, 45], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 244] },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: 14, right: 14 },
    });
    doc.save(`relatorio-${data.projeto.nome}.pdf`);
  }

  function exportExcel() {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.lancamentos.map((l) => ({
      Data: l.data, Tipo: l.tipo, Categoria: l.categoria ?? "",
      Descrição: l.descricao ?? "", Valor: Number(l.valor),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, `relatorio-${data.projeto.nome}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">Reviva Moz · Portal do Financiador</p>
            <h1 className="text-2xl font-bold">{data.projeto.nome}</h1>
            <p className="text-sm text-muted-foreground">
              Período: {formatDate(data.periodo.inicio)} a {formatDate(data.periodo.fim)}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Somente-leitura · expira {formatDateTime(data.expires_at)}</Badge>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Entradas</CardDescription>
            <CardTitle className="text-2xl text-primary">{formatMZN(Number(data.kpis.entradas), { compact: true })}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Saídas</CardDescription>
            <CardTitle className="text-2xl text-destructive">{formatMZN(Number(data.kpis.saidas), { compact: true })}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Saldo</CardDescription>
            <CardTitle className="text-2xl">{formatMZN(saldo, { compact: true })}</CardTitle></CardHeader></Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Lançamentos</CardTitle>
              <CardDescription>{data.lancamentos.length} registos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportPDF}><FileDown className="mr-1 h-4 w-4" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.lancamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th className="text-right">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2">{formatDate(l.data)}</td>
                        <td><Badge variant={l.tipo === "entrada" ? "default" : "destructive"}>{l.tipo}</Badge></td>
                        <td>{l.categoria ?? "—"}</td>
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

        <p className="text-center text-xs text-muted-foreground">
          Documento gerado pelo sistema Reviva Moz · Gestão Financeira
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
