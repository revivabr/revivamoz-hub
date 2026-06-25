import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { testAiProviderEndpoints } from "@/lib/ai.functions";
import { toast } from "sonner";

import {
  MODELOS_POR_PROVEDOR,
  PROVEDOR_LABEL,
  modelValueForProvider,
  type ProvedorTipo as Provedor,
} from "@/lib/ai-models";

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
  const testEndpoint = useServerFn(testAiProviderEndpoints);
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
      return ((data ?? []) as Row[]).map((row) => ({
        ...row,
        default_model: modelValueForProvider(row.provedor, row.default_model),
      }));
    },
  });

  const existing = provedores.find((p) => p.provedor === novo);

  // Quando muda o provedor selecionado, pré-preenche o modelo com o atual (se existir)
  useEffect(() => {
    setModel(existing?.default_model ?? PROVEDOR_INFO[novo].defaultModel);
    setApiKey("");
  }, [novo, existing?.default_model]);

  const upsert = useMutation({
    mutationFn: async (args: { provedor: Provedor; api_key?: string; default_model: string }) => {
      const existsRow = provedores.find((p) => p.provedor === args.provedor);
      if (existsRow) {
        // Update — só atualiza a chave se foi fornecida
        const patch: { default_model: string; api_key?: string } = { default_model: args.default_model };
        if (args.api_key) patch.api_key = args.api_key;
        const { error } = await supabase.from("ai_provedores").update(patch).eq("provedor", args.provedor);
        if (error) throw error;
      } else {
        if (!args.api_key) throw new Error("API Key obrigatória ao criar um novo provedor.");
        const { error } = await supabase.from("ai_provedores").insert({
          provedor: args.provedor,
          api_key: args.api_key,
          default_model: args.default_model,
          enabled: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Provedor guardado.");
      qc.invalidateQueries({ queryKey: ["ai-provedores"] });
      qc.invalidateQueries({ queryKey: ["ai-provedores-publico"] });
      setApiKey("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Ativar um provedor desativa os outros (exclusividade)
  const toggle = useMutation({
    mutationFn: async ({ provedor, enabled }: { provedor: Provedor; enabled: boolean }) => {
      if (enabled) {
        const { error: e1 } = await supabase.from("ai_provedores").update({ enabled: false }).neq("provedor", provedor);
        if (e1) throw e1;
      }
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

  const endpointTest = useMutation({
    mutationFn: async (provedor: Provedor) => testEndpoint({ data: { provedor } }),
    onSuccess: (result) => {
      toast.success(`Endpoint validado: ${result.model} (${result.flavor})`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveModel = modelValueForProvider(novo, model);
  const isEditing = !!existing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Provedores de IA</CardTitle>
        <CardDescription>
          Configure as chaves dos provedores externos. A API Key é guardada uma única vez; pode alterar
          o modelo padrão a qualquer momento sem reinserir a chave. Apenas um provedor pode estar ativo
          de cada vez — ativar um desativa automaticamente os restantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-3 sm:grid-cols-[160px_1fr_280px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isEditing && !apiKey.trim()) {
              toast.error("Insira a API Key para registar este provedor.");
              return;
            }
            upsert.mutate({
              provedor: novo,
              api_key: apiKey.trim() || undefined,
              default_model: saveModel,
            });
          }}
        >
          <div className="space-y-1">
            <Label>Provedor</Label>
            <Select value={novo} onValueChange={(v) => setNovo(v as Provedor)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVEDOR_INFO) as Provedor[]).map((p) => (
                  <SelectItem key={p} value={p}>{PROVEDOR_INFO[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>API Key {isEditing && <span className="text-xs text-muted-foreground">(opcional — deixe vazio para manter)</span>}</Label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={isEditing ? `••••${existing!.api_key.slice(-4)} (manter)` : PROVEDOR_INFO[novo].help}
            />
          </div>
          <div className="space-y-1">
            <Label>Modelo por defeito</Label>
            <Select value={saveModel} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVEDOR_INFO[novo].models.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => endpointTest.mutate(p.provedor)}
                      disabled={endpointTest.isPending}
                    >
                      Testar endpoint
                    </Button>
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
