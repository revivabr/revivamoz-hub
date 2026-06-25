import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { MODELOS_POR_PROVEDOR, PROVEDOR_LABEL, type ProvedorTipo as Provedor } from "@/lib/ai-models";

const PROVEDOR_INFO: Record<Provedor, { label: string; defaultModel: string; models: string[]; help: string }> = {
  openai: {
    label: PROVEDOR_LABEL.openai,
    defaultModel: MODELOS_POR_PROVEDOR.openai[1],
    models: MODELOS_POR_PROVEDOR.openai,
    help: "Chave em platform.openai.com/api-keys.",
  },
  gemini: {
    label: PROVEDOR_LABEL.gemini,
    defaultModel: MODELOS_POR_PROVEDOR.gemini[0],
    models: MODELOS_POR_PROVEDOR.gemini,
    help: "Chave em aistudio.google.com/apikey.",
  },
  opencode_go: {
    label: PROVEDOR_LABEL.opencode_go,
    defaultModel: MODELOS_POR_PROVEDOR.opencode_go[0],
    models: MODELOS_POR_PROVEDOR.opencode_go,
    help: "Subscrição em opencode.ai/auth.",
  },
};

type Row = { provedor: Provedor; api_key: string; default_model: string; base_url: string | null; enabled: boolean };

export function AiProvedoresCard() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState<Provedor>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVEDOR_INFO.openai.defaultModel);

  const { data: provedores = [] } = useQuery({
    queryKey: ["ai-provedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provedores")
        .select("provedor, api_key, default_model, base_url, enabled");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: { provedor: Provedor; api_key: string; default_model: string; enabled: boolean }) => {
      const { error } = await supabase.from("ai_provedores").upsert(row, { onConflict: "provedor" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provedor guardado.");
      qc.invalidateQueries({ queryKey: ["ai-provedores"] });
      qc.invalidateQueries({ queryKey: ["ai-provedores-publico"] });
      setApiKey("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ provedor, enabled }: { provedor: Provedor; enabled: boolean }) => {
      const { error } = await supabase.from("ai_provedores").update({ enabled }).eq("provedor", provedor);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-provedores"] });
      qc.invalidateQueries({ queryKey: ["ai-provedores-publico"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (p: Provedor) => {
      const { error } = await supabase.from("ai_provedores").delete().eq("provedor", p);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provedor removido.");
      qc.invalidateQueries({ queryKey: ["ai-provedores"] });
      qc.invalidateQueries({ queryKey: ["ai-provedores-publico"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Provedores de IA</CardTitle>
        <CardDescription>
          Configure as chaves dos provedores externos. Cada utilizador pode então usar o Assistente IA
          com qualquer provedor ativo. As chaves nunca são expostas ao browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-3 sm:grid-cols-[160px_1fr_200px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!apiKey.trim()) return;
            upsert.mutate({ provedor: novo, api_key: apiKey.trim(), default_model: model, enabled: true });
          }}
        >
          <div className="space-y-1">
            <Label>Provedor</Label>
            <Select value={novo} onValueChange={(v) => {
              const p = v as Provedor;
              setNovo(p);
              setModel(PROVEDOR_INFO[p].defaultModel);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVEDOR_INFO) as Provedor[]).map((p) => (
                  <SelectItem key={p} value={p}>{PROVEDOR_INFO[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>API Key</Label>
            <Input type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={PROVEDOR_INFO[novo].help} />
          </div>
          <div className="space-y-1">
            <Label>Modelo por defeito</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} list={`models-${novo}`} />
            <datalist id={`models-${novo}`}>
              {PROVEDOR_INFO[novo].models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={upsert.isPending}>
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          {provedores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum provedor configurado ainda.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {provedores.map((p) => (
                <li key={p.provedor} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{PROVEDOR_INFO[p.provedor].label}</span>
                      <Badge variant={p.enabled ? "default" : "secondary"}>
                        {p.enabled ? "Ativo" : "Desativado"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Modelo: {p.default_model} · chave ••••{p.api_key.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={p.enabled}
                      onCheckedChange={(v) => toggle.mutate({ provedor: p.provedor, enabled: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(`Remover provedor ${p.provedor}?`)) remove.mutate(p.provedor);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
