import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2, Plus, Trash2, Download, MessageSquare, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { assistenteAsk, listConversas, getConversa, deleteConversa } from "@/lib/ai.functions";
import { PROVEDOR_LABEL, type ProvedorTipo } from "@/lib/ai-models";
import { drawReportHeader } from "@/lib/pdf-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA · Reviva Moz" },
      { name: "description", content: "Converse com os seus dados financeiros." },
    ],
  }),
  component: AssistentePage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Qual o saldo atual de cada projeto?",
  "Quais foram as 5 maiores saídas deste mês?",
  "Que despesas poderíamos cortar em caso de redução de gastos?",
  "Compare entradas vs saídas dos últimos 3 meses.",
  "Qual projeto tem maior risco financeiro?",
  "Liste as categorias de saída mais frequentes.",
];

function AssistentePage() {
  const qc = useQueryClient();
  const ask = useServerFn(assistenteAsk);
  const list = useServerFn(listConversas);
  const getC = useServerFn(getConversa);
  const delC = useServerFn(deleteConversa);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: provedores = [] } = useQuery({
    queryKey: ["ai-provedores-publico"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_ai_provedores_publico");
      if (error) throw error;
      return data ?? [];
    },
  });
  const ativo = provedores[0];

  const { data: conversas = [] } = useQuery({
    queryKey: ["assistente-conversas"],
    queryFn: () => list({}),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, [conversaId]);

  const mutation = useMutation({
    mutationFn: async (question: string) => ask({ data: { history: messages, question, conversaId } }),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.content }]);
      if (res.conversaId && res.conversaId !== conversaId) setConversaId(res.conversaId);
      qc.invalidateQueries({ queryKey: ["assistente-conversas"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setMessages((m) => m.slice(0, -1));
    },
  });

  const sendQuestion = (q: string) => {
    if (!q.trim() || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    mutation.mutate(q);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input.trim());
  };

  const novaConversa = () => {
    setMessages([]);
    setConversaId(null);
    setInput("");
    inputRef.current?.focus();
  };

  const abrirConversa = async (id: string) => {
    try {
      const c = await getC({ data: { id } });
      if (!c) return;
      setConversaId(c.id);
      setMessages((c.mensagens as Msg[]) ?? []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const apagarConversa = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await delC({ data: { id } });
      if (id === conversaId) novaConversa();
      qc.invalidateQueries({ queryKey: ["assistente-conversas"] });
      toast.success("Conversa apagada");
    } catch (err: any) { toast.error(err.message); }
  };

  const exportarPDF = async () => {
    if (messages.length === 0) { toast.error("Conversa vazia"); return; }
    const doc = new jsPDF();
    const startY = await drawReportHeader(doc, {
      title: "Conversa · Assistente IA",
      subtitleLines: [new Date().toLocaleString("pt-PT")],
    });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const maxW = pageW - marginX * 2;
    let y = startY;
    doc.setFontSize(10);
    for (const m of messages) {
      const label = m.role === "user" ? "Você" : "Aida (IA)";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(m.role === "user" ? 20 : 50, m.role === "user" ? 83 : 50, m.role === "user" ? 45 : 50);
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(label, marginX, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      const lines = doc.splitTextToSize(m.content, maxW);
      for (const ln of lines) {
        if (y > 285) { doc.addPage(); y = 20; }
        doc.text(ln, marginX, y); y += 5;
      }
      y += 3;
    }
    doc.save(`conversa-aida-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const titulo = useMemo(() => {
    if (conversaId) return conversas.find((c: any) => c.id === conversaId)?.titulo ?? "Conversa";
    return "Nova conversa";
  }, [conversaId, conversas]);

  if (!ativo) {
    return (
      <DashboardLayout title="Assistente IA">
        <EmptyState
          icon={Sparkles}
          title="Nenhum provedor de IA ativo"
          description="Peça ao Super Admin para ativar um provedor (OpenAI, Gemini ou Opencode-Go) em Configurações → IA."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assistente IA">
      <div className="grid h-[calc(100vh-12rem)] gap-3 md:grid-cols-[260px_1fr]">
        {/* Sidebar histórico */}
        <Card className="hidden md:flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4" /> Últimos 7 dias</div>
            <Button size="sm" variant="ghost" onClick={novaConversa} title="Nova conversa">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversas.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sem conversas ainda.</p>
              )}
              {conversas.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => abrirConversa(c.id)}
                  className={cn(
                    "group flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-xs hover:bg-muted",
                    conversaId === c.id && "bg-muted"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-medium">{c.titulo}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString("pt-PT")}
                    </div>
                  </div>
                  <button
                    onClick={(e) => apagarConversa(c.id, e)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{titulo}</span>
              <Badge variant="secondary">
                {PROVEDOR_LABEL[ativo.provedor as ProvedorTipo] ?? ativo.provedor} · {ativo.default_model}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={novaConversa} className="md:hidden">
                <Plus className="mr-1 h-4 w-4" /> Nova
              </Button>
              <Button size="sm" variant="outline" onClick={exportarPDF} disabled={messages.length === 0}>
                <Download className="mr-1 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          <Card className="flex-1 overflow-hidden">
            <CardContent
              ref={scrollRef as React.RefObject<HTMLDivElement>}
              className="h-full space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm">
                  <div className="max-w-lg space-y-4">
                    <Sparkles className="mx-auto h-10 w-10 text-primary" />
                    <div>
                      <div className="text-base font-semibold">Olá! Sou a Aida 👋</div>
                      <p className="text-muted-foreground">
                        Pergunte sobre os projetos a que tem acesso — saldos, despesas, tendências.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SUGESTOES.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendQuestion(s)}
                          className="rounded-lg border bg-card p-3 text-left text-xs transition hover:border-primary hover:bg-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-table:my-2"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
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
              ref={inputRef}
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
      </div>
    </DashboardLayout>
  );
}
