import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import {
  isSuperAdminQuery, meQuery, projetosListQuery,
} from "@/lib/subprojetos/queries";
import type { Projeto } from "@/lib/subprojetos/types";
import { ProjetoCard } from "@/components/subprojetos/ProjetoCard";
import { CreateProjetoDialog } from "@/components/subprojetos/CreateProjetoDialog";
import { ProjetoDetailDialog } from "@/components/subprojetos/ProjetoDetailDialog";
import { ConvitesParaMim } from "@/components/subprojetos/ConvitesParaMim";

export const Route = createFileRoute("/_authenticated/subprojetos")({
  head: () => ({
    meta: [
      { title: "Subprojetos · Reviva Moz" },
      { name: "description", content: "PEPEs e obras geridos pela Associação Reviva Moz." },
    ],
  }),
  component: SubprojectsPage,
});

function SubprojectsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<Projeto | null>(null);

  const { data: me } = useQuery(meQuery);
  const { data: isSuperAdmin } = useQuery(isSuperAdminQuery(me?.id));
  const { data: projetos = [], isLoading } = useQuery(projetosListQuery);

  const canCreate = !!isSuperAdmin;

  return (
    <DashboardLayout title={t("nav.subprojects")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Projetos</h2>
          <p className="text-sm text-muted-foreground">
            Cada projeto tem o seu próprio orçamento, equipa e financiadores.
          </p>
        </div>
        {canCreate && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo projeto</Button>
            </DialogTrigger>
            <CreateProjetoDialog
              onClose={() => setOpenCreate(false)}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ["projetos"] });
                setOpenCreate(false);
              }}
              userId={me?.id ?? ""}
            />
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : projetos.length === 0 ? (
        <Card className="grid place-items-center py-12 text-center">
          <FolderKanban className="mb-3 h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-base">Ainda sem projetos</CardTitle>
          <CardDescription className="max-w-sm">
            {canCreate
              ? "Crie o primeiro projeto e convide a sua equipa."
              : "Aguarde um convite de um gestor para começar a colaborar."}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projetos.map((p) => (
            <ProjetoCard key={p.id} p={p} onOpenMembros={() => setSelected(p)} />
          ))}
        </div>
      )}

      <ConvitesParaMim />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <ProjetoDetailDialog
            projeto={selected}
            currentUserId={me?.id ?? ""}
            isSuperAdmin={!!isSuperAdmin}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </DashboardLayout>
  );
}
