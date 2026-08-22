import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  LancamentoFormFields, emptyLancamentoForm, uploadComprovante,
} from "./LancamentoFormFields";
import type { Categoria, Etapa } from "@/lib/projetos/types";

interface Props {
  projetoId: string;
  categorias: Categoria[];
  etapas: Etapa[];
  userId: string;
  onSaved: () => void;
  triggerSize?: "default" | "sm" | "lg";
  triggerFullWidth?: boolean;
  isSuperAdmin?: boolean;
}

export function NovoLancamentoDialog({ projetoId, categorias, etapas, userId, onSaved, triggerSize = "default", triggerFullWidth = false, isSuperAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyLancamentoForm);

  const mutate = useMutation({
    mutationFn: async () => {
      const payload = {
        projeto_id: projetoId,
        tipo: form.tipo,
        data: form.data,
        valor: Number(form.valor) || 0,
        descricao: form.descricao.trim() || null,
        categoria_id: form.categoria_id || null,
        etapa_id: form.etapa_id || null,
        created_by: userId,
      };
      const file = fileRef.current?.files?.[0];

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { queueLancamento } = await import("@/lib/offline-queue");
        queueLancamento(payload);
        return { offline: true };
      }

      const comprovante_path = file ? await uploadComprovante(projetoId, file) : null;
      const { error } = await supabase.from("lancamentos").insert({ ...payload, comprovante_path });
      if (error) throw error;
      return { offline: false };
    },
    onSuccess: (res) => {
      toast.success(res?.offline ? "Sem ligação — guardado para sincronizar." : "Lançamento registado.");
      setForm(emptyLancamentoForm());
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={triggerSize}
          className={`${triggerFullWidth ? "w-full " : ""}shadow-md hover:shadow-lg transition-shadow ${triggerSize === "lg" ? "text-base font-semibold" : ""}`}
        >
          <Plus className={triggerSize === "lg" ? "mr-2 h-5 w-5" : "mr-2 h-4 w-4"} />Novo lançamento
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutate.mutate(); }}>
          <LancamentoFormFields
            projetoId={projetoId}
            form={form}
            onChange={setForm}
            categorias={categorias}
            etapas={etapas}
            isSuperAdmin={isSuperAdmin}
            fileRef={fileRef}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutate.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
