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
import { renderMarkdownToPdf } from "@/lib/pdf-markdown";
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
    queryFn: () => list(),
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
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentW = pageW - marginX * 2;
    let y = startY;

    for (const m of messages) {
      const isUser = m.role === "user";
      const label = isUser ? "Você" : "Aida · Assistente IA";

      if (y > pageH - 30) { doc.addPage(); y = 20; }

      // Role chip
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const labelW = doc.getTextWidth(label) + 6;
      if (isUser) {
        doc.setFillColor(20, 83, 45);
        doc.roundedRect(pageW - marginX - labelW, y - 4, labelW, 6, 1.5, 1.5, "F");
        doc.setTextColor(255);
        doc.text(label, pageW - marginX - 3, y, { align: "right" });
      } else {
        doc.setFillColor(232, 240, 234);
        doc.roundedRect(marginX, y - 4, labelW, 6, 1.5, 1.5, "F");
        doc.setTextColor(20, 83, 45);
        doc.text(label, marginX + 3, y);
      }
      y += 5;

      // Bubble background
      const bubbleX = isUser ? marginX + 20 : marginX;
      const bubbleMaxW = contentW - 20;
      const bubbleStartY = y;

      // Pre-measure by rendering on a virtual pass? Simpler: render then draw bg behind via clip.
      // Strategy: render content, then draw a light separator line under it.
      const endY = renderMarkdownToPdf(doc, m.content, {
        x: bubbleX + 3,
        y: y + 2,
        maxW: bubbleMaxW - 6,
        bottomMargin: 15,
      });

      // Subtle bubble outline if it stayed on the same page
      if (endY > bubbleStartY && endY < pageH - 10) {
        doc.setDrawColor(isUser ? 20 : 220, isUser ? 83 : 220, isUser ? 45 : 220);
        doc.setLineWidth(0.2);
        doc.setFillColor(isUser ? 240 : 250, isUser ? 247 : 250, isUser ? 242 : 250);
        // Draw under-line only to avoid covering text
        doc.line(bubbleX, endY + 1, bubbleX + bubbleMaxW, endY + 1);
      }
      y = endY + 6;
    }

    // Footer page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`${i} / ${pages}`, pageW / 2, pageH - 6, { align: "center" });
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
                          : "bg-muted text-foreground"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ node, ...p }) => <h3 className="mt-2 mb-1 text-base font-semibold" {...p} />,
                            h2: ({ node, ...p }) => <h3 className="mt-2 mb-1 text-base font-semibold" {...p} />,
                            h3: ({ node, ...p }) => <h3 className="mt-2 mb-1 text-[15px] font-semibold" {...p} />,
                            h4: ({ node, ...p }) => <h4 className="mt-2 mb-1 text-sm font-semibold" {...p} />,
                            p: ({ node, ...p }) => <p className="my-1 leading-relaxed" {...p} />,
                            ul: ({ node, ...p }) => <ul className="my-1 ml-5 list-disc space-y-0.5" {...p} />,
                            ol: ({ node, ...p }) => <ol className="my-1 ml-5 list-decimal space-y-0.5" {...p} />,
                            li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
                            strong: ({ node, ...p }) => <strong className="font-semibold text-foreground" {...p} />,
                            em: ({ node, ...p }) => <em className="italic" {...p} />,
                            hr: () => <hr className="my-3 border-border" />,
                            a: ({ node, ...p }) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
                            code: ({ node, className, children, ...p }: any) => {
                              const isBlock = /language-/.test(className ?? "");
                              return isBlock ? (
                                <pre className="my-2 overflow-x-auto rounded-md bg-background/60 p-2 text-xs"><code className={className} {...p}>{children}</code></pre>
                              ) : (
                                <code className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]" {...p}>{children}</code>
                              );
                            },
                            blockquote: ({ node, ...p }) => <blockquote className="my-2 border-l-2 border-primary/60 pl-3 italic text-muted-foreground" {...p} />,
                            table: ({ node, ...p }) => (
                              <div className="my-2 overflow-x-auto rounded-md border border-border">
                                <table className="w-full border-collapse text-xs" {...p} />
                              </div>
                            ),
                            thead: ({ node, ...p }) => <thead className="bg-background/60" {...p} />,
                            th: ({ node, ...p }) => <th className="border-b border-border px-2 py-1.5 text-left font-semibold" {...p} />,
                            td: ({ node, ...p }) => <td className="border-b border-border/50 px-2 py-1.5" {...p} />,
                            tr: ({ node, ...p }) => <tr className="even:bg-background/30" {...p} />,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
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
