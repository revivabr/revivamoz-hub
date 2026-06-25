import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Categoria, Etapa } from "@/lib/projetos/types";

interface Props {
  projetoId: string;
  categorias: Categoria[];
  etapas: Etapa[];
  userId: string;
  onSaved: () => void;
}

const initialForm = () => ({
  tipo: "saida" as "entrada" | "saida",
  data: new Date().toISOString().slice(0, 10),
  valor: "",
  descricao: "",
  categoria_id: "",
  etapa_id: "",
});

async function uploadComprovante(projetoId: string, file: File): Promise<string> {
  const path = `${projetoId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("comprovantes").upload(path, file);
  if (error) throw error;
  return path;
}

export function NovoLancamentoDialog({ projetoId, categorias, etapas, userId, onSaved }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catNome, setCatNome] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initialForm);

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
      setForm(initialForm());
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catsFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Novo lançamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutate.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as "entrada" | "saida", categoria_id: "" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" required value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input type="number" min="0" step="0.01" required value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.categoria_id}
                onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {catsFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                  {catsFiltradas.length > 0 && <div className="my-1 h-px bg-border" />}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setCatOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" /> Criar categoria
                  </button>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Etapa (opcional)</Label>
              <Select value={form.etapa_id}
                onValueChange={(v) => setForm({ ...form, etapa_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {etapas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Upload className="h-3 w-3" /> Comprovante (opcional)
            </Label>
            <Input ref={fileRef} type="file" accept="image/*,application/pdf" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutate.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) setCatNome(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar categoria ({form.tipo})</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const nome = catNome.trim();
              if (!nome) return;
              const { data, error } = await supabase
                .from("categorias")
                .insert({ projeto_id: projetoId, tipo: form.tipo, nome })
                .select("id")
                .single();
              if (error) { toast.error(error.message); return; }
              await qc.invalidateQueries({ queryKey: ["categorias", projetoId] });
              setForm((f) => ({ ...f, categoria_id: data.id }));
              setCatNome("");
              setCatOpen(false);
              toast.success("Categoria criada.");
            }}
          >
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input autoFocus value={catNome} onChange={(e) => setCatNome(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCatOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
