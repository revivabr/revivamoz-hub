import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Reviva Moz" },
      { name: "description", content: "Configurações do sistema Reviva Moz." },
      { property: "og:title", content: "Configurações · Reviva Moz" },
      { property: "og:description", content: "Configurações do sistema Reviva Moz." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <DashboardLayout title={t("nav.settings")}>
      <EmptyState
        icon={Settings}
        title={t("empty.settings.title")}
        description={t("empty.settings.desc")}
      />
    </DashboardLayout>
  );
}
