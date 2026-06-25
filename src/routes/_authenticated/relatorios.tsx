import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · Reviva Moz" },
      { name: "description", content: "Relatórios exportáveis dos subprojetos e mantenedores." },
      { property: "og:title", content: "Relatórios · Reviva Moz" },
      { property: "og:description", content: "Relatórios exportáveis dos subprojetos e mantenedores." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t } = useI18n();
  return (
    <DashboardLayout title={t("nav.reports")}>
      <EmptyState
        icon={FileBarChart}
        title={t("empty.reports.title")}
        description={t("empty.reports.desc")}
      />
    </DashboardLayout>
  );
}
