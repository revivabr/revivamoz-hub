import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, HelpCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useI18n } from "@/lib/i18n";
import { useOnboarding } from "@/components/onboarding/OnboardingTour";

export const Route = createFileRoute("/_authenticated/subprojetos")({
  head: () => ({
    meta: [
      { title: "Subprojetos · Reviva Moz" },
      { name: "description", content: "PEPEs e obras geridos pela Associação Reviva Moz." },
      { property: "og:title", content: "Subprojetos · Reviva Moz" },
      { property: "og:description", content: "PEPEs e obras geridos pela Associação Reviva Moz." },
    ],
  }),
  component: SubprojectsPage,
});

function SubprojectsPage() {
  const { t } = useI18n();
  const { open } = useOnboarding();
  return (
    <DashboardLayout title={t("nav.subprojects")}>
      <EmptyState
        icon={FolderKanban}
        title={t("empty.subprojects.title")}
        description={t("empty.subprojects.desc")}
        action={
          <button
            onClick={open}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <HelpCircle className="h-4 w-4" />
            {t("empty.action.help")}
          </button>
        }
      />
    </DashboardLayout>
  );
}
