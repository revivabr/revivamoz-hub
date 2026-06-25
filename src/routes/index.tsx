import { createFileRoute } from "@tanstack/react-router";
import { PiggyBank, TrendingUp, TrendingDown, FolderKanban } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ExpensesBarChart } from "@/components/dashboard/ExpensesBarChart";
import { CostsDonutChart } from "@/components/dashboard/CostsDonutChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { kpis } from "@/lib/mock-data";
import { formatMZN } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Global · Reviva Moz" },
      {
        name: "description",
        content:
          "Painel consolidado do Super Admin da Associação Reviva Moz: KPIs financeiros, despesas comparativas e últimas transações dos PEPEs e obras.",
      },
      { property: "og:title", content: "Visão Global · Reviva Moz" },
      {
        property: "og:description",
        content:
          "Gestão financeira centralizada da Associação Reviva Moz — PEPEs, obras e fluxo de caixa em Moçambique.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t, locale } = useI18n();
  return (
    <DashboardLayout title={t("nav.overview")}>
      <div className="space-y-5 sm:space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t("kpi.global_balance")}
            value={formatMZN(kpis.saldoGlobal, { compact: true, locale })}
            hint={t("kpi.updated_now")}
            icon={PiggyBank}
            accent="primary"
            tooltip={t("tip.kpi.balance")}
          />
          <KpiCard
            title={t("kpi.revenue")}
            value={formatMZN(kpis.receitasMes, { compact: true, locale })}
            delta={kpis.receitasDelta}
            hint={t("kpi.vs_previous")}
            icon={TrendingUp}
            accent="success"
            tooltip={t("tip.kpi.revenue")}
          />
          <KpiCard
            title={t("kpi.expenses")}
            value={formatMZN(kpis.despesasMes, { compact: true, locale })}
            delta={kpis.despesasDelta}
            hint={t("kpi.vs_previous")}
            icon={TrendingDown}
            accent="destructive"
            tooltip={t("tip.kpi.expenses")}
          />
          <KpiCard
            title={t("kpi.active_projects")}
            value={String(kpis.projetosAtivos)}
            hint={t("kpi.active_projects_hint", {
              pepes: kpis.projetosPepes,
              obras: kpis.projetosObras,
            })}
            icon={FolderKanban}
            accent="accent"
            tooltip={t("tip.kpi.projects")}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ExpensesBarChart />
          </div>
          <div className="lg:col-span-5">
            <CostsDonutChart />
          </div>
        </section>

        <section>
          <TransactionsTable />
        </section>
      </div>
    </DashboardLayout>
  );
}
