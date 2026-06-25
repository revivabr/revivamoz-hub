import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

function CashflowPage() {
  const { t } = useI18n();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lancamentos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("id,projeto_id,tipo,data,valor,descricao, projetos:projetos(nome,moeda)")
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const totais = useMemo(() => {
    const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
    const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  return (
    <DashboardLayout title={t("nav.cashflow")}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title={t("empty.cashflow.title")} description={t("empty.cashflow.desc")} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Kpi label="Entradas" value={totais.entradas} icon={TrendingUp} tone="ok" />
            <Kpi label="Saídas" value={totais.saidas} icon={TrendingDown} tone="warn" />
            <Kpi label="Saldo" value={totais.saldo} icon={Wallet} tone={totais.saldo >= 0 ? "ok" : "danger"} />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Últimos lançamentos</CardTitle></CardHeader>
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
                        {new Date(r.data).toLocaleDateString("pt-PT")} ·
                        {" "}
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
