import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProvedorEnum = z.enum(["openai", "gemini", "opencode_go"]);

const ChatInput = z.object({
  provedor: ProvedorEnum,
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ).min(1),
  temperature: z.number().min(0).max(2).optional(),
});

type Provedor = z.infer<typeof ProvedorEnum>;

function endpointFor(p: Provedor, baseUrl: string | null): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "") + "/chat/completions";
  switch (p) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "opencode_go":
      return "https://opencode.ai/zen/go/v1/chat/completions";
  }
}

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg, error } = await supabaseAdmin
      .from("ai_provedores")
      .select("api_key, base_url, enabled")
      .eq("provedor", data.provedor)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!cfg || !cfg.enabled) {
      throw new Error(
        `Provedor ${data.provedor} não está configurado. Peça ao Super Admin para o ativar em Configurações → IA.`,
      );
    }

    const url = endpointFor(data.provedor, cfg.base_url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.api_key}`,
      },
      body: JSON.stringify({
        model: data.model,
        messages: data.messages,
        temperature: data.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Erro do provedor (${res.status}): ${txt.slice(0, 400)}`);
    }
    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content };
  });

// Assistente — agrega contexto financeiro do utilizador antes de chamar o modelo
const AskInput = z.object({
  provedor: ProvedorEnum,
  model: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  question: z.string().min(1),
});

export const assistenteAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    // Projetos visíveis ao utilizador (RLS aplica-se)
    const { data: projetos } = await sb
      .from("projetos")
      .select("id, nome, tipo, orcamento, estado")
      .limit(50);

    const ids = (projetos ?? []).map((p) => p.id);
    let lancamentos: Array<{
      projeto_id: string; data: string; tipo: string; valor: number; descricao: string | null;
    }> = [];
    if (ids.length > 0) {
      const { data: lx } = await sb
        .from("lancamentos")
        .select("projeto_id, data, tipo, valor, descricao")
        .in("projeto_id", ids)
        .order("data", { ascending: false })
        .limit(200);
      lancamentos = (lx ?? []) as typeof lancamentos;
    }

    // Resumos por projeto
    const resumo = (projetos ?? []).map((p) => {
      const lx = lancamentos.filter((l) => l.projeto_id === p.id);
      const entradas = lx.filter((l) => l.tipo === "entrada").reduce((a, l) => a + Number(l.valor), 0);
      const saidas = lx.filter((l) => l.tipo === "saida").reduce((a, l) => a + Number(l.valor), 0);
      return {
        nome: p.nome,
        tipo: p.tipo,
        orcamento: p.orcamento,
        entradas, saidas,
        saldo: entradas - saidas,
      };
    });

    const system = `És o Assistente financeiro da Reviva Moz. Responde sempre em português de Moçambique, conciso e claro.
Usa exclusivamente os dados abaixo (em MZN) para responder. Se a resposta não estiver nos dados, diz que não tens essa informação.

PROJETOS (resumo agregado):
${JSON.stringify(resumo, null, 2)}

ÚLTIMAS TRANSAÇÕES (até 200, mais recentes):
${JSON.stringify(lancamentos.slice(0, 100), null, 2)}`;

    const messages = [
      { role: "system" as const, content: system },
      ...data.history,
      { role: "user" as const, content: data.question },
    ];

    return await aiChat({ data: { provedor: data.provedor, model: data.model, messages } });
  });
