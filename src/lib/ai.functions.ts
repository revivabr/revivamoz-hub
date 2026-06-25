import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiProvider, type ChatMessage } from "@/lib/ai/providers";
import type { ProvedorTipo } from "@/lib/ai-models";

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

async function loadProviderConfig(provedor: ProvedorTipo) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_provedores")
    .select("api_key, base_url, enabled, default_model")
    .eq("provedor", provedor)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function loadActiveProvider() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_provedores")
    .select("provedor, default_model, api_key, base_url")
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const cfg = await loadProviderConfig(data.provedor);
    if (!cfg || !cfg.enabled) {
      throw new Error(
        `Provedor ${data.provedor} não está configurado. Peça ao Super Admin para o ativar em Configurações → IA.`,
      );
    }
    const { content } = await callAiProvider({
      provedor: data.provedor,
      model: data.model,
      messages: data.messages,
      temperature: data.temperature,
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
    });
    return { content };
  });

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data: isSuperAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!isSuperAdmin) throw new Error("Apenas Super Admins podem testar endpoints de IA.");
}

export const testAiProviderEndpoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provedor: ProvedorEnum }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);

    const cfg = await loadProviderConfig(data.provedor);
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

// Assistente: agrega contexto financeiro e usa o provedor ativo configurado pelo Super Admin.
const AskInput = z.object({
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  question: z.string().min(1),
});

type ProjetoRow = { id: string; nome: string; tipo: string; orcamento: number | null; estado: string | null };
type LancRow = { projeto_id: string; data: string; tipo: string; valor: number; descricao: string | null };

async function fetchFinancialContext(sb: any) {
  const { data: projetos } = await sb
    .from("projetos")
    .select("id, nome, tipo, orcamento, estado")
    .limit(50);

  const ids = ((projetos ?? []) as ProjetoRow[]).map((p) => p.id);
  if (ids.length === 0) return { projetos: [] as ProjetoRow[], lancamentos: [] as LancRow[] };

  const { data: lx } = await sb
    .from("lancamentos")
    .select("projeto_id, data, tipo, valor, descricao")
    .in("projeto_id", ids)
    .order("data", { ascending: false })
    .limit(200);

  return {
    projetos: (projetos ?? []) as ProjetoRow[],
    lancamentos: (lx ?? []) as LancRow[],
  };
}

function summarizeProjects(projetos: ProjetoRow[], lancamentos: LancRow[]) {
  return projetos.map((p) => {
    const lx = lancamentos.filter((l) => l.projeto_id === p.id);
    const entradas = lx.filter((l) => l.tipo === "entrada").reduce((a, l) => a + Number(l.valor), 0);
    const saidas = lx.filter((l) => l.tipo === "saida").reduce((a, l) => a + Number(l.valor), 0);
    return { nome: p.nome, tipo: p.tipo, orcamento: p.orcamento, entradas, saidas, saldo: entradas - saidas };
  });
}

function buildSystemPrompt(resumo: unknown, lancamentos: LancRow[]) {
  return `És o Assistente financeiro da Reviva Moz. Responde sempre em português de Moçambique, conciso e claro.
Usa exclusivamente os dados abaixo (em MZN) para responder. Se a resposta não estiver nos dados, diz que não tens essa informação.

PROJETOS (resumo agregado):
${JSON.stringify(resumo, null, 2)}

ÚLTIMAS TRANSAÇÕES (até 200, mais recentes):
${JSON.stringify(lancamentos.slice(0, 100), null, 2)}`;
}

export const assistenteAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const ativo = await loadActiveProvider();
    if (!ativo) {
      throw new Error("Nenhum provedor de IA ativo. Peça ao Super Admin para ativar um em Configurações → IA.");
    }

    const { projetos, lancamentos } = await fetchFinancialContext(context.supabase);
    const resumo = summarizeProjects(projetos, lancamentos);

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(resumo, lancamentos) },
      ...data.history,
      { role: "user", content: data.question },
    ];

    const { content } = await callAiProvider({
      provedor: ativo.provedor as ProvedorTipo,
      model: ativo.default_model,
      messages,
      apiKey: ativo.api_key,
      baseUrl: ativo.base_url,
    });
    return { content, provedor: ativo.provedor, model: ativo.default_model };
  });
