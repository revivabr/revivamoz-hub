import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Moon, Sun, Languages } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import heroLight from "@/assets/login-hero-light.jpeg";
import heroDark from "@/assets/login-hero-dark.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Reviva Moz" },
      { name: "description", content: "Acesso interno à plataforma de gestão financeira da Associação Reviva Moz." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OK");
    navigate({ to: "/" });
  }

  const hero = theme === "dark" ? heroDark : heroLight;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-10 min-w-10 place-items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent"
              aria-label="Idioma"
            >
              <span className="flex items-center gap-1.5">
                <Languages className="h-4 w-4" />
                <span>{locale === "pt-MZ" ? "PT-MZ" : "PT-BR"}</span>
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
          onClick={toggle}
          aria-label={t("auth.theme_toggle")}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-accent"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:flex items-center justify-center p-8 bg-muted/30">
          <img
            src={hero}
            alt="Associação RevivaMoz"
            className="max-h-[85vh] w-full max-w-2xl rounded-2xl object-cover shadow-lg"
          />
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md space-y-6">
            <div className="lg:hidden">
              <img
                src={hero}
                alt="Associação RevivaMoz"
                className="w-full rounded-2xl object-cover shadow-sm"
              />
            </div>

            <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t("auth.heading")}
              </h1>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t("auth.email")}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t("auth.password")}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? t("auth.signing_in") : t("auth.signin")}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                {t("auth.hint")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
