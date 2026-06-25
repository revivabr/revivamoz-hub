import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeAiModelId, type ProvedorTipo } from "@/lib/ai-models";

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

// Modelos Opencode-Go que usam o endpoint Anthropic-compatible (/v1/messages)
const OPENCODE_ANTHROPIC_MODELS = new Set([
  "minimax-m3",
  "minimax-m2.7",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
]);

function endpointFor(p: Provedor, model: string, baseUrl: string | null): {
  url: string;
  flavor: "openai" | "anthropic";
} {
  if (p === "opencode_go" && OPENCODE_ANTHROPIC_MODELS.has(model)) {
    return {
      url: (baseUrl?.replace(/\/$/, "") ?? "https://opencode.ai/zen/go/v1") + "/messages",
      flavor: "anthropic",
    };
  }
  if (baseUrl) return { url: baseUrl.replace(/\/$/, "") + "/chat/completions", flavor: "openai" };
  switch (p) {
    case "openai":
      return { url: "https://api.openai.com/v1/chat/completions", flavor: "openai" };
    case "gemini":
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        flavor: "openai",
      };
    case "opencode_go":
      return { url: "https://opencode.ai/zen/go/v1/chat/completions", flavor: "openai" };
  }
}

async function callAiProvider(args: {
  provedor: Provedor;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  apiKey: string;
  baseUrl: string | null;
}) {
  const providerModel = normalizeAiModelId(args.provedor as ProvedorTipo, args.model);
  const { url, flavor } = endpointFor(args.provedor, providerModel, args.baseUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${args.apiKey}`,
  };

  let body: string;
  if (flavor === "anthropic") {
    const system = args.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const msgs = args.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    headers["anthropic-version"] = "2023-06-01";
    headers["x-api-key"] = args.apiKey;
    delete headers.Authorization;
    body = JSON.stringify({
      model: providerModel,
      max_tokens: 4096,
      temperature: args.temperature ?? 0.3,
      system: system || undefined,
      messages: msgs,
    });
  } else {
    body = JSON.stringify({
      model: providerModel,
      messages: args.messages,
      temperature: args.temperature ?? 0.3,
    });
  }

  const res = await fetch(url, { method: "POST", headers, body });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro do provedor (${res.status}): ${txt.slice(0, 400)}`);
  }
  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: Array<{ text?: string }>;
  };
  const content = flavor === "anthropic"
    ? (json.content?.map((c) => c.text ?? "").join("") ?? "")
    : (json.choices?.[0]?.message?.content ?? "");
  return { content, endpoint: url, flavor, providerModel };
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

    const result = await callAiProvider({
      provedor: data.provedor,
      model: data.model,
      messages: data.messages,
      temperature: data.temperature,
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
    });
    return { content: result.content };
  });

export const testAiProviderEndpoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provedor: ProvedorEnum }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isSuperAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isSuperAdmin) throw new Error("Apenas Super Admins podem testar endpoints de IA.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg, error } = await supabaseAdmin
      .from("ai_provedores")
      .select("api_key, base_url, enabled, default_model")
      .eq("provedor", data.provedor)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!cfg || !cfg.enabled) throw new Error("Provedor não configurado ou desativado.");

    if (data.provedor === "opencode_go") {
      const modelsRes = await fetch("https://opencode.ai/zen/go/v1/models", {
        headers: { Authorization: `Bearer ${cfg.api_key}` },
      });
      if (!modelsRes.ok) {
        const txt = await modelsRes.text();
        throw new Error(`Erro ao listar modelos (${modelsRes.status}): ${txt.slice(0, 300)}`);
      }
    }

    const chatResult = await callAiProvider({
      provedor: data.provedor,
      model: cfg.default_model,
      messages: [{ role: "user", content: "Responda apenas: ok" }],
      temperature: 0,
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
    });

    return {
      ok: true,
      model: cfg.default_model,
      endpoint: chatResult.endpoint.replace(/^https:\/\//, ""),
      flavor: chatResult.flavor,
    };
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
