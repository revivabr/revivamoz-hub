import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Workflow, Wallet, FileBarChart, Settings, Sprout, ListChecks, Sparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const items = [
    { titleKey: "nav.overview", url: "/", icon: LayoutDashboard },
    { titleKey: "nav.subprojects", url: "/subprojetos", icon: Workflow },
    { titleKey: "nav.cashflow", url: "/fluxo-caixa", icon: Wallet },
    { titleKey: "nav.reports", url: "/relatorios", icon: FileBarChart },
    { titleKey: "nav.roadmap", url: "/roadmap", icon: ListChecks },
    { titleKey: "nav.settings", url: "/configuracoes", icon: Settings },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              Reviva Moz
            </div>
            <div className="truncate text-[11px] text-sidebar-foreground/70">
              {t("brand.tagline")}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.section")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                const label = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
