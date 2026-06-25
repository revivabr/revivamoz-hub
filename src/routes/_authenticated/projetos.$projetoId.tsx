import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, AlertTriangle, Layers, Wallet,
  TrendingUp, TrendingDown, Download,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjetoLogo, ProjetoLogoUploader } from "@/components/projetos/ProjetoLogo";
import { ProjetoKpiCard } from "@/components/projetos/ProjetoKpiCard";
import { NovoLancamentoDialog } from "@/components/projetos/NovoLancamentoDialog";
import { LancamentosLista } from "@/components/projetos/LancamentosLista";
import { EtapasSection } from "@/components/projetos/EtapasSection";
import { CategoriaPies } from "@/components/projetos/CategoriaPies";

import { exportProjeto } from "@/lib/ops.functions";
import { projetoQuery, lancamentosQuery, etapasQuery, categoriasQuery } from "@/lib/projetos/queries";
import { computeTotals, formatMoney } from "@/lib/projetos/totals";

export const Route = createFileRoute("/_authenticated/projetos/$projetoId")({
  head: () => ({
    meta: [
      { title: "Projeto · Reviva Moz" },
      { name: "description", content: "Painel financeiro individual de um projeto." },
    ],
  }),
  errorComponent: ({ error }) => (
    <DashboardLayout title="Projeto"><p className="text-sm text-destructive">{error.message}</p></DashboardLayout>
  ),
  notFoundComponent: () => (
    <DashboardLayout title="Projeto"><p className="text-sm text-muted-foreground">Projeto não encontrado.</p></DashboardLayout>
  ),
  component: ProjetoDashboard,
});

function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
}

function useIsSuperAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-super-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: userId!, _role: "super_admin" });
      return !!data;
    },
  });
}

function useIsGestor(projetoId: string, userId: string | undefined, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: ["is-gestor-proj", projetoId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_projeto_gestor", { _user_id: userId!, _projeto_id: projetoId });
      return !!data || isSuperAdmin;
    },
  });
}

function ProjetoDashboard() {
  const { projetoId } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: isSuperAdmin } = useIsSuperAdmin(me?.id);
  const { data: isGestor } = useIsGestor(projetoId, me?.id, !!isSuperAdmin);

  const { data: projeto, isLoading: loadingProj } = useQuery(projetoQuery(projetoId));
  const { data: lancamentos = [] } = useQuery(lancamentosQuery(projetoId));
  const { data: etapas = [] } = useQuery(etapasQuery(projetoId));
  const { data: categorias = [] } = useQuery(categoriasQuery(projetoId));

  const totals = useMemo(
    () => computeTotals(lancamentos, etapas, projeto),
    [lancamentos, etapas, projeto],
  );

  const doExport = useServerFn(exportProjeto);

  if (loadingProj) {
    return <DashboardLayout title="…"><p className="text-sm text-muted-foreground">A carregar…</p></DashboardLayout>;
  }
  if (!projeto) {
    return <DashboardLayout title="Projeto"><p className="text-sm text-muted-foreground">Projeto não encontrado ou sem acesso.</p></DashboardLayout>;
  }

  const fmt = (n: number) => formatMoney(n, projeto.moeda);
  const alertaTeto = totals.consumido >= 80;

  const exportar = async () => {
    try {
      const dump = await doExport({ data: { projetoId } });
      downloadJson(dump, `${projeto.nome.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Exportação concluída.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const invalidate = (key: string) => () => qc.invalidateQueries({ queryKey: [key, projetoId] });

  return (
    <DashboardLayout title={projeto.nome}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/subprojetos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos projetos
        </Link>
        <div className="flex items-center gap-2">
          {isGestor && (
            <Button size="sm" variant="outline" onClick={exportar}>
              <Download className="mr-1 h-4 w-4" /> Exportar dados
            </Button>
          )}
          <Badge variant="outline">{projeto.estado}</Badge>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-[280px_1fr] md:items-start">
        <div className="space-y-2">
          {isGestor ? (
            <ProjetoLogoUploader
              projetoId={projeto.id}
              nome={projeto.nome}
              logoPath={projeto.logo_path}
              onChanged={invalidate("projeto")}
            />
          ) : (
            <ProjetoLogo projetoId={projeto.id} nome={projeto.nome} logoPath={projeto.logo_path} />
          )}
        </div>
        {projeto.descricao && (
          <p className="text-sm text-muted-foreground">{projeto.descricao}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProjetoKpiCard label="Entradas" value={fmt(totals.entradas)} icon={TrendingUp} tone="ok" />
        <ProjetoKpiCard label="Saídas" value={fmt(totals.saidas)} icon={TrendingDown} tone="warn" />
        <ProjetoKpiCard label="Saldo" value={fmt(totals.saldo)} icon={Wallet} tone={totals.saldo >= 0 ? "ok" : "danger"} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento consumido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{totals.consumido.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">de {fmt(totals.orc)}</span>
            </div>
            <Progress value={totals.consumido} className="mt-2" />
            {alertaTeto && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> Atingiu {totals.consumido.toFixed(0)}% do orçamento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos" className="mt-6">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-4 space-y-4">
          {isGestor && (
            <NovoLancamentoDialog
              projetoId={projetoId}
              categorias={categorias}
              etapas={etapas}
              userId={me?.id ?? ""}
              onSaved={invalidate("lancamentos")}
            />
          )}
          <LancamentosLista
            lancamentos={lancamentos}
            categorias={categorias}
            etapas={etapas}
            moeda={projeto.moeda}
            canEdit={!!isGestor}
            onChanged={invalidate("lancamentos")}
          />
        </TabsContent>

        <TabsContent value="etapas" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />Progresso físico
                </CardTitle>
                <CardDescription>Média ponderada das etapas: {totals.progressoFisico.toFixed(0)}%</CardDescription>
              </div>
            </CardHeader>
            <CardContent><Progress value={totals.progressoFisico} /></CardContent>
          </Card>
          <EtapasSection
            projetoId={projetoId}
            etapas={etapas}
            canEdit={!!isGestor}
            onChanged={invalidate("etapas")}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
