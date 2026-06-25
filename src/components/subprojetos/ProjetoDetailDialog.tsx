import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProjetoLogo, ProjetoLogoUploader } from "@/components/projetos/ProjetoLogo";
import { membrosQuery } from "@/lib/subprojetos/queries";
import type { Projeto } from "@/lib/subprojetos/types";
import { EstadoBadge } from "./EstadoBadge";
import { MembrosList } from "./MembrosList";
import { ConvitesSection } from "./ConvitesSection";

type Props = {
  projeto: Projeto;
  currentUserId: string;
  isSuperAdmin: boolean;
  onClose: () => void;
};

export function ProjetoDetailDialog({ projeto, currentUserId, isSuperAdmin, onClose }: Props) {
  const qc = useQueryClient();
  const { data: membros = [] } = useQuery(membrosQuery(projeto.id));

  const isGestor = useMemo(
    () => isSuperAdmin || membros.some((m) => m.user_id === currentUserId && m.papel === "gestor"),
    [membros, currentUserId, isSuperAdmin],
  );

  const apagar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projetos").delete().eq("id", projeto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto apagado.");
      qc.invalidateQueries({ queryKey: ["projetos"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {projeto.nome} <EstadoBadge estado={projeto.estado} />
        </DialogTitle>
        <DialogDescription>{projeto.descricao || "Sem descrição."}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {isGestor ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Logótipo do projeto</h3>
            <ProjetoLogoUploader
              projetoId={projeto.id}
              nome={projeto.nome}
              logoPath={projeto.logo_path}
              onChanged={() => qc.invalidateQueries({ queryKey: ["projetos"] })}
            />
          </section>
        ) : (
          <ProjetoLogo projetoId={projeto.id} nome={projeto.nome} logoPath={projeto.logo_path} />
        )}

        <MembrosList
          projetoId={projeto.id}
          membros={membros}
          currentUserId={currentUserId}
          isGestor={isGestor}
        />

        {isGestor && (
          <ConvitesSection
            projetoId={projeto.id}
            projetoNome={projeto.nome}
            currentUserId={currentUserId}
          />
        )}
      </div>

      <DialogFooter className="justify-between sm:justify-between">
        {isSuperAdmin ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Apagar definitivamente o projeto "${projeto.nome}"?`)) apagar.mutate();
            }}
            disabled={apagar.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />Apagar projeto
          </Button>
        ) : <span />}
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
