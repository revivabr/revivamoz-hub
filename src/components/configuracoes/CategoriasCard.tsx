import { useState } from "react";
import { Tag, Trash2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Projeto = { id: string; nome: string };
type Categoria = { id: string; nome: string; tipo: "entrada" | "saida"; projeto_id: string | null };

export function CategoriasCard() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<string>("__global__"); // "__global__" or projeto id
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [nome, setNome] = useState("");

  const projetoId = scope === "__global__" ? null : scope;

  const { data: projetos = [] } = useQuery({
    queryKey: ["cfg-projetos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select("id,nome").order("nome");
      if (error) throw error;
      return data as Projeto[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["cfg-categorias", projetoId, tipo],
    queryFn: async () => {
      const q = supabase.from("categorias").select("id,nome,tipo,projeto_id").eq("tipo", tipo).order("nome");
      const { data, error } = projetoId
        ? await q.eq("projeto_id", projetoId)
        : await q.is("projeto_id", null);
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const clean = nome.trim();
      if (!clean) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("categorias").insert({
        projeto_id: projetoId, tipo, nome: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      qc.invalidateQueries({ queryKey: ["cfg-categorias", projetoId, tipo] });
      qc.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Categoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cfg-categorias", projetoId, tipo] });
      qc.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Categoria removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" /> Categorias
        </CardTitle>
        <CardDescription>
          Categorias globais aparecem em todos os projetos. Categorias por projeto só aparecem nesse projeto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Âmbito</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">🌐 Global (todos os projetos)</SelectItem>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "entrada" | "saida")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
        >
          <Input
            placeholder="Nome da categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Button type="submit" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </form>

        <div className="space-y-1">
          {categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem categorias neste âmbito.</p>
          ) : (
            categorias.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{c.nome}</span>
                  <Badge variant="outline" className="text-xs">
                    {c.projeto_id ? "Projeto" : "Global"}
                  </Badge>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    if (confirm(`Remover "${c.nome}"?`)) deleteMutation.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
