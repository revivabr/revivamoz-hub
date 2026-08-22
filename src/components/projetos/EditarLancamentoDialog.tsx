// Diálogo para editar um lançamento existente (gestor do projeto ou super admin).
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  LancamentoFormFields, uploadComprovante, type LancamentoFormState,
} from "./LancamentoFormFields";
import { ComprovantePreview } from "./ComprovantePreview";
import type { Categoria, Etapa, Lancamento } from "@/lib/projetos/types";

interface Props {
  lancamento: Lancamento;
  projetoId: string;
  categorias: Categoria[];
  etapas: Etapa[];
  isSuperAdmin: boolean;
  onSaved: () => void;
}

const formFromLancamento = (l: Lancamento): LancamentoFormState => ({
  tipo: l.tipo,
  data: l.data,
  valor: String(l.valor),
  descricao: l.descricao ?? "",
  categoria_id: l.categoria_id ?? "",
  etapa_id: l.etapa_id ?? "",
});

export function EditarLancamentoDialog({
  lancamento: l, projetoId, categorias, etapas, isSuperAdmin, onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LancamentoFormState>(() => formFromLancamento(l));
  const [removerComprovante, setRemoverComprovante] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const abrir = (v: boolean) => {
    if (v) {
      // Repõe os dados atuais sempre que a janela abre.
      setForm(formFromLancamento(l));
      setRemoverComprovante(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    setOpen(v);
  };

  const mutate = useMutation({
    mutationFn: async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("A edição requer ligação à internet.");
      }

      let comprovante_path = l.comprovante_path;
      const file = fileRef.current?.files?.[0];

      if (file) {
        // Substitui: envia o novo e remove o antigo do armazenamento.
        comprovante_path = await uploadComprovante(projetoId, file);
        if (l.comprovante_path) {
          await supabase.storage.from("comprovantes").remove([l.comprovante_path]);
        }
      } else if (removerComprovante && l.comprovante_path) {
        await supabase.storage.from("comprovantes").remove([l.comprovante_path]);
        comprovante_path = null;
      }

      const { error } = await supabase
        .from("lancamentos")
        .update({
          tipo: form.tipo,
          data: form.data,
          valor: Number(form.valor) || 0,
          descricao: form.descricao.trim() || null,
          categoria_id: form.categoria_id || null,
          etapa_id: form.etapa_id || null,
          comprovante_path,
        })
        .eq("id", l.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento atualizado.");
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Editar lançamento" aria-label="Editar lançamento">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader><DialogTitle>Editar lançamento</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutate.mutate(); }}>
          <LancamentoFormFields
            projetoId={projetoId}
            form={form}
            onChange={setForm}
            categorias={categorias}
            etapas={etapas}
            isSuperAdmin={isSuperAdmin}
            fileRef={fileRef}
            comprovanteLabel={l.comprovante_path ? "Substituir comprovante (opcional)" : "Comprovante (opcional)"}
            comprovanteAtual={l.comprovante_path ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Comprovante atual
                  <ComprovantePreview path={l.comprovante_path} />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={removerComprovante}
                    onChange={(e) => setRemoverComprovante(e.target.checked)}
                    className="h-3.5 w-3.5 accent-destructive"
                  />
                  Remover
                </label>
              </div>
            ) : undefined}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "A guardar…" : "Guardar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
