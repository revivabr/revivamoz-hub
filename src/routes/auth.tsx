import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Moon, Sun } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import logoUrl from "@/assets/reviva-logo.png";
import heroLight from "@/assets/login-hero-light.jpeg";
import heroDark from "@/assets/login-hero-dark.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    toast.success("Sessão iniciada");
    navigate({ to: "/" });
  }

  const hero = theme === "dark" ? heroDark : heroLight;

  return (
    <div className="relative min-h-screen bg-background">
      <button
        type="button"
        onClick={toggle}
        aria-label="Alternar tema"
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-accent"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Hero */}
        <div className="hidden lg:flex items-center justify-center p-8 bg-muted/30">
          <img
            src={hero}
            alt="Associação RevivaMoz - Restaurando Vidas e Valores"
            className="max-h-[85vh] w-full max-w-2xl rounded-2xl object-cover shadow-lg"
          />
        </div>

        {/* Form */}
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
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
                  <img src={logoUrl} alt="RevivaMoz" className="h-full w-full object-cover" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">RevivaMoz</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Gestão Financeira</p>
                </div>
              </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
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
                <Label htmlFor="signin-password">Palavra-passe</Label>
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
                Entrar
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              As credenciais são emitidas pelo Super Administrador. Se precisa de acesso, contacte-o.
            </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
