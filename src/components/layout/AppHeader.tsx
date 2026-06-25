import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Search, Moon, Sun, Languages, HelpCircle, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useOnboarding } from "@/components/onboarding/OnboardingTour";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader({ title }: { title: string }) {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { open: openTour } = useOnboarding();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<{ name: string; email: string; avatar?: string | null }>({
    name: "",
    email: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setProfile({
        name: p?.full_name || user.email?.split("@")[0] || "Utilizador",
        email: user.email ?? "",
        avatar: p?.avatar_url,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";


  return (
    <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:gap-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-foreground" />
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="relative hidden min-w-0 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={t("header.search")}
          className="h-9 w-full max-w-md rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-9 min-w-9 place-items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              aria-label={t("header.language")}
            >
              <span className="flex items-center gap-1">
                <Languages className="h-4 w-4" />
                <span className="hidden sm:inline">{locale === "pt-MZ" ? "PT-MZ" : "PT-BR"}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => setLocale("pt-MZ")}>
              🇲🇿 Português (Moçambique)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale("pt-BR")}>
              🇧🇷 Português (Brasil)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={openTour}
          className="hidden h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground sm:grid"
          aria-label={t("header.help")}
          title={t("header.help")}
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
          aria-label={theme === "dark" ? t("header.theme.light") : t("header.theme.dark")}
          title={theme === "dark" ? t("header.theme.light") : t("header.theme.dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
          aria-label={t("header.notifications")}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-1 pr-2 transition hover:bg-accent sm:pr-3"
            >
              <Avatar className="h-7 w-7">
                {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left sm:block">
                <div className="truncate text-xs font-semibold leading-tight text-foreground">
                  {profile.name || "—"}
                </div>
                <div className="truncate text-[10px] font-medium uppercase tracking-wide text-primary">
                  {profile.email}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}>
              {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
