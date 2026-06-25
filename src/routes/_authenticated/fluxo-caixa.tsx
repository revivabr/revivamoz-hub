import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa · Reviva Moz" },
      { name: "description", content: "Lançamentos e movimentos financeiros dos subprojetos." },
      { property: "og:title", content: "Fluxo de Caixa · Reviva Moz" },
      { property: "og:description", content: "Lançamentos e movimentos financeiros dos subprojetos." },
    ],
  }),
  component: CashflowPage,
});

function CashflowPage() {
  const { t } = useI18n();
  return (
    <DashboardLayout title={t("nav.cashflow")}>
      <EmptyState
        icon={Wallet}
        title={t("empty.cashflow.title")}
        description={t("empty.cashflow.desc")}
      />
    </DashboardLayout>
  );
}
