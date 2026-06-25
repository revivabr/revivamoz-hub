import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { assistenteAsk } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA · Reviva Moz" },
      { name: "description", content: "Pergunte aos seus dados financeiros em linguagem natural." },
    ],
  }),
  component: AssistentePage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistentePage() {
  const ask = useServerFn(assistenteAsk);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [provedor, setProvedor] = useState<"openai" | "gemini" | "opencode_go" | "">("");
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: provedores = [] } = useQuery({
    queryKey: ["ai-provedores-publico"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_ai_provedores_publico");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!provedor && provedores.length > 0) {
      setProvedor(provedores[0].provedor as typeof provedor);
      setModel(provedores[0].default_model);
    }
  }, [provedores, provedor]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: async (question: string) => {
      if (!provedor || !model) throw new Error("Selecione um provedor de IA.");
      return ask({ data: { provedor, model, history: messages, question } });
    },
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.content }]),
    onError: (e: Error) => {
      toast.error(e.message);
      setMessages((m) => m.slice(0, -1));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    mutation.mutate(q);
  };

  if (provedores.length === 0) {
    return (
      <DashboardLayout title="Assistente IA">
        <EmptyState
          icon={Sparkles}
          title="Nenhum provedor de IA configurado"
          description="Peça ao Super Admin para configurar um provedor (OpenAI, Gemini ou Opencode-Go) em Configurações → IA."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assistente IA">
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={provedor} onValueChange={(v) => {
            const p = provedores.find((x) => x.provedor === v);
            setProvedor(v as typeof provedor);
            if (p) setModel(p.default_model);
          }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Provedor" /></SelectTrigger>
            <SelectContent>
              {provedores.map((p) => (
                <SelectItem key={p.provedor} value={p.provedor}>{p.provedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="modelo"
          />
        </div>

        <Card className="flex-1 overflow-hidden">
          <CardContent ref={scrollRef as React.RefObject<HTMLDivElement>} className="h-full space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="grid place-items-center text-center text-sm text-muted-foreground h-full">
                <div>
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary" />
                  Pergunte sobre os seus projetos, saldos e despesas.
                  <div className="mt-2 text-xs">Ex.: "Qual o projeto com maior saída este mês?"</div>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>{m.content}</div>
                </div>
              ))
            )}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> a pensar…
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={submit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
            placeholder="Pergunte ao seu painel financeiro…"
            rows={2}
            className="resize-none"
          />
          <Button type="submit" disabled={mutation.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
