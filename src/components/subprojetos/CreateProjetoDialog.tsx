import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ESTADOS, type ProjetoEstado, type ProjetoTipo } from "@/lib/subprojetos/types";

type Props = { onClose: () => void; onCreated: () => void; userId: string };

const TIPO_HINT: Record<ProjetoTipo, string> = {
  programa_social: "Recebe doações recorrentes para mantimento contínuo.",
  caixa_administrativo: "Livro caixa para registo de entradas e saídas; orçamento opcional como saldo inicial.",
  projeto_sazonal: "Orçamento fixo com prazo de início e fim; despesas subtraem do total.",
};

export function CreateProjetoDialog({ onClose, onCreated, userId }: Props) {
  const [form, setForm] = useState({
    nome: "", descricao: "",
    tipo: "projeto_sazonal" as ProjetoTipo,
    estado: "planeado" as ProjetoEstado,
    orcamento: "0", moeda: "MZN",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: projeto, error } = await supabase
        .from("projetos")
        .insert({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          tipo: form.tipo,
          estado: form.estado,
          orcamento: Number(form.orcamento) || 0,
          moeda: form.moeda,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memErr } = await supabase
        .from("projeto_membros")
        .insert({ projeto_id: projeto.id, user_id: userId, papel: "gestor" });
      if (memErr) throw memErr;
    },
    onSuccess: () => { toast.success("Projeto criado."); onCreated(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo projeto</DialogTitle>
        <DialogDescription>O criador entra automaticamente como Gestor.</DialogDescription>
      </DialogHeader>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as ProjetoTipo })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programa_social">Programa Social (doações mensais)</SelectItem>
              <SelectItem value="projeto_sazonal">Projeto Sazonal (orçamento fixo)</SelectItem>
              <SelectItem value="caixa_administrativo">Caixa Administrativo (livro caixa)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{TIPO_HINT[form.tipo]}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as ProjetoEstado })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Orçamento</Label>
            <Input type="number" min="0" step="0.01" value={form.orcamento} onChange={(e) => setForm({ ...form, orcamento: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Moeda</Label>
            <Input value={form.moeda} onChange={(e) => setForm({ ...form, moeda: e.target.value.toUpperCase() })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>Criar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
