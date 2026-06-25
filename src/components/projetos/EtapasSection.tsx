import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { Etapa } from "@/lib/projetos/types";

interface Props {
  projetoId: string;
  etapas: Etapa[];
  canEdit: boolean;
  onChanged: () => void;
}

const initialForm = () => ({
  nome: "", descricao: "", peso: "0", valor_previsto: "0", data_inicio: "", data_fim: "",
});

export function EtapasSection({ projetoId, etapas, canEdit, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("etapas").insert({
        projeto_id: projetoId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        peso: Number(form.peso) || 0,
        valor_previsto: Number(form.valor_previsto) || 0,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        ordem: etapas.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa criada.");
      setForm(initialForm());
      setOpen(false);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarProgresso = useMutation({
    mutationFn: async ({ id, progresso }: { id: string; progresso: number }) => {
      const { error } = await supabase.from("etapas").update({ progresso }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("etapas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Etapas de obra</CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Nova etapa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova etapa</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
                <Field label="Nome">
                  <Input required value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </Field>
                <Field label="Descrição">
                  <Textarea rows={2} value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Peso (%)">
                    <Input type="number" min="0" max="100" step="0.1" value={form.peso}
                      onChange={(e) => setForm({ ...form, peso: e.target.value })} />
                  </Field>
                  <Field label="Valor previsto">
                    <Input type="number" min="0" step="0.01" value={form.valor_previsto}
                      onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início">
                    <Input type="date" value={form.data_inicio}
                      onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                  </Field>
                  <Field label="Fim">
                    <Input type="date" value={form.data_fim}
                      onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                  </Field>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={criar.isPending}>Criar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem etapas.</p>
        ) : (
          etapas.map((e) => (
            <EtapaRow
              key={e.id}
              etapa={e}
              canEdit={canEdit}
              onProgress={(progresso) => atualizarProgresso.mutate({ id: e.id, progresso })}
              onDelete={() => {
                if (confirm(`Apagar etapa "${e.nome}"?`)) apagar.mutate(e.id);
              }}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EtapaRow({
  etapa: e, canEdit, onProgress, onDelete,
}: {
  etapa: Etapa;
  canEdit: boolean;
  onProgress: (v: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{e.nome}</div>
          {e.descricao && <p className="text-xs text-muted-foreground">{e.descricao}</p>}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Peso {Number(e.peso)}%</span>
            <span>Previsto {Number(e.valor_previsto).toLocaleString("pt-PT")}</span>
          </div>
        </div>
        {canEdit && (
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={Number(e.progresso)} className="flex-1" />
        {canEdit ? (
          <Input
            type="number" min={0} max={100} step={5}
            defaultValue={Number(e.progresso)}
            className="w-20"
            onBlur={(ev) => {
              const v = Math.max(0, Math.min(100, Number(ev.target.value)));
              if (v !== Number(e.progresso)) onProgress(v);
            }}
          />
        ) : (
          <span className="w-12 text-right text-sm">{Number(e.progresso)}%</span>
        )}
      </div>
    </div>
  );
}
