import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ComprovantePreview } from "./ComprovantePreview";
import { EditarLancamentoDialog } from "./EditarLancamentoDialog";
import type { Categoria, Etapa, Lancamento } from "@/lib/projetos/types";

interface Props {
  lancamentos: Lancamento[];
  categorias: Categoria[];
  etapas: Etapa[];
  moeda: string;
  canEdit: boolean;
  isSuperAdmin: boolean;
  projetoId: string;
  onChanged: () => void;
}

async function deleteLancamento(l: Lancamento) {
  if (l.comprovante_path) {
    await supabase.storage.from("comprovantes").remove([l.comprovante_path]);
  }
  const { error } = await supabase.from("lancamentos").delete().eq("id", l.id);
  if (error) throw error;
}

export function LancamentosLista({
  lancamentos, categorias, etapas, moeda, canEdit, isSuperAdmin, projetoId, onChanged,
}: Props) {
  const catMap = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nome])),
    [categorias],
  );
  const etapaMap = useMemo(
    () => Object.fromEntries(etapas.map((e) => [e.id, e.nome])),
    [etapas],
  );

  const apagar = useMutation({
    mutationFn: deleteLancamento,
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  if (!lancamentos.length) {
    return (
      <Card className="grid place-items-center py-10 text-center">
        <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
        <CardTitle className="text-base">Ainda sem lançamentos</CardTitle>
        <CardDescription>Registe a primeira entrada ou saída.</CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {lancamentos.map((l) => (
            <LancamentoRow
              key={l.id}
              lancamento={l}
              moeda={moeda}
              canEdit={canEdit}
              categoriaNome={l.categoria_id ? catMap[l.categoria_id] : undefined}
              etapaNome={l.etapa_id ? etapaMap[l.etapa_id] : undefined}
              onDelete={() => {
                if (confirm("Apagar este lançamento?")) apagar.mutate(l);
              }}
              editDialog={canEdit ? (
                <EditarLancamentoDialog
                  lancamento={l}
                  projetoId={projetoId}
                  categorias={categorias}
                  etapas={etapas}
                  isSuperAdmin={isSuperAdmin}
                  onSaved={onChanged}
                />
              ) : null}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LancamentoRow({
  lancamento: l, moeda, canEdit, categoriaNome, etapaNome, onDelete, editDialog,
}: {
  lancamento: Lancamento;
  moeda: string;
  canEdit: boolean;
  categoriaNome?: string;
  etapaNome?: string;
  onDelete: () => void;
  editDialog?: React.ReactNode;
}) {
  const isEntrada = l.tipo === "entrada";
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={isEntrada ? "default" : "secondary"} className="capitalize">{l.tipo}</Badge>
          <span className="truncate text-sm font-medium">
            {l.descricao || categoriaNome || "Sem descrição"}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {new Date(l.data).toLocaleDateString("pt-PT")}
          {categoriaNome && ` · ${categoriaNome}`}
          {etapaNome && ` · ${etapaNome}`}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${isEntrada ? "text-emerald-600" : "text-destructive"}`}>
          {isEntrada ? "+" : "−"} {Number(l.valor).toLocaleString("pt-PT")} {moeda}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1">
          {l.comprovante_path && <ComprovantePreview path={l.comprovante_path} />}
          {editDialog}
          {canEdit && (
            <Button size="icon" variant="ghost" onClick={onDelete} title="Apagar lançamento" aria-label="Apagar lançamento">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
