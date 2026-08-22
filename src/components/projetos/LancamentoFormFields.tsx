// Campos do formulário de lançamento, partilhados entre criar e editar.
import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Plus, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Categoria, Etapa } from "@/lib/projetos/types";

export type LancamentoFormState = {
  tipo: "entrada" | "saida";
  data: string;
  valor: string;
  descricao: string;
  categoria_id: string;
  etapa_id: string;
};

export const emptyLancamentoForm = (): LancamentoFormState => ({
  tipo: "saida",
  data: new Date().toISOString().slice(0, 10),
  valor: "",
  descricao: "",
  categoria_id: "",
  etapa_id: "",
});

export async function uploadComprovante(projetoId: string, file: File): Promise<string> {
  const path = `${projetoId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("comprovantes").upload(path, file);
  if (error) throw error;
  return path;
}

interface Props {
  projetoId: string;
  form: LancamentoFormState;
  onChange: (form: LancamentoFormState) => void;
  categorias: Categoria[];
  etapas: Etapa[];
  isSuperAdmin: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  /** Conteúdo extra mostrado acima do campo de ficheiro (ex.: comprovante atual na edição). */
  comprovanteAtual?: ReactNode;
  comprovanteLabel?: string;
}

export function LancamentoFormFields({
  projetoId, form, onChange, categorias, etapas, isSuperAdmin, fileRef,
  comprovanteAtual, comprovanteLabel = "Comprovante (opcional)",
}: Props) {
  const qc = useQueryClient();
  const [catOpen, setCatOpen] = useState(false);
  const [catNome, setCatNome] = useState("");

  const catsFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  const criarCategoria = async () => {
    const nome = catNome.trim();
    if (!nome) return;
    const { data, error } = await supabase
      .from("categorias")
      .insert({ projeto_id: projetoId, tipo: form.tipo, nome })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["categorias", projetoId] });
    onChange({ ...form, categoria_id: data.id });
    setCatNome("");
    setCatOpen(false);
    toast.success("Categoria criada.");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select
            value={form.tipo}
            onValueChange={(v) => onChange({ ...form, tipo: v as "entrada" | "saida", categoria_id: "" })}
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
            onChange={(e) => onChange({ ...form, data: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Valor</Label>
        <Input type="number" min="0" step="0.01" required value={form.valor}
          onChange={(e) => onChange({ ...form, valor: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.categoria_id}
            onValueChange={(v) => onChange({ ...form, categoria_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {catsFiltradas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
              {isSuperAdmin && (
                <>
                  {catsFiltradas.length > 0 && <div className="my-1 h-px bg-border" />}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setCatOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" /> Criar categoria
                  </button>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Etapa (opcional)</Label>
          <Select value={form.etapa_id}
            onValueChange={(v) => onChange({ ...form, etapa_id: v })}>
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
          onChange={(e) => onChange({ ...form, descricao: e.target.value })} />
      </div>
      {comprovanteAtual}
      <div className="space-y-1">
        <Label className="flex items-center gap-2">
          <Upload className="h-3 w-3" /> {comprovanteLabel}
        </Label>
        <Input ref={fileRef} type="file" accept="image/*,application/pdf" />
      </div>

      <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) setCatNome(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar categoria ({form.tipo})</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); criarCategoria(); }}
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
    </>
  );
}
