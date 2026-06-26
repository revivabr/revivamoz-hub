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
type ProjetoRow = { id: string; nome: string; tipo: string; orcamento: number | null; estado: string | null };
type LancRow = { projeto_id: string; data: string; tipo: string; valor: number; descricao: string | null; categoria_id?: string | null };

async function fetchFinancialContext(sb: any) {
  // Cliente RLS-scoped: só vê projetos/lançamentos do utilizador (ou todos se super_admin).
  const { data: projetos } = await sb
    .from("projetos")
    .select("id, nome, tipo, orcamento, estado")
    .limit(50);

  const ids = ((projetos ?? []) as ProjetoRow[]).map((p) => p.id);
  if (ids.length === 0) return { projetos: [] as ProjetoRow[], lancamentos: [] as LancRow[] };

  const { data: lx } = await sb
    .from("lancamentos")
    .select("projeto_id, data, tipo, valor, descricao, categoria_id")
    .in("projeto_id", ids)
    .order("data", { ascending: false })
    .limit(300);

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
    return {
      nome: p.nome,
      tipo: p.tipo,
      estado: p.estado,
      orcamento: p.orcamento,
      entradas,
      saidas,
      saldo: entradas - saidas,
      execucao_pct: p.orcamento ? Number(((saidas / Number(p.orcamento)) * 100).toFixed(1)) : null,
    };
  });
}

function buildSystemPrompt(resumo: unknown, lancamentos: LancRow[]) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `És a "Aida" — Assistente Inteligente de Dados da Reviva Moz (ONG em Moçambique).

PERSONALIDADE
- Calorosa, profissional e respeitosa. Trata o utilizador por "você".
- Responde sempre em português de Moçambique, com tom humano e claro.
- Usa emojis com moderação (📊 💰 ⚠️ ✅) apenas quando ajudam a leitura.
- Estrutura respostas com **negrito**, listas e tabelas markdown quando útil.
- Termina análises com 1 sugestão prática (ex.: "Quer que eu detalhe por categoria?").

REGRAS
- Hoje é ${hoje}. Valores em Meticais (MZN), formato 1.234,56 MZN.
- Usa EXCLUSIVAMENTE os dados abaixo. Se faltar info, diz "Não tenho esses dados no contexto atual" — nunca inventes números.
- Os dados já estão filtrados aos projetos a que este utilizador tem acesso (RLS).
- Para "que saída cortar?": analisa maiores saídas, identifica padrões (descrições/categorias repetidas) e propõe 2-3 candidatos com justificativa (valor + frequência + impacto).
- Para previsões: usa média mensal das transações e declara explicitamente que é estimativa.

CONTEXTO — PROJETOS (resumo agregado em MZN):
${JSON.stringify(resumo, null, 2)}

CONTEXTO — TRANSAÇÕES (até 200 mais recentes):
${JSON.stringify(lancamentos.slice(0, 200), null, 2)}`;
}

const AskInput = z.object({
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  question: z.string().min(1),
  conversaId: z.string().uuid().optional().nullable(),
});

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

    // Persiste a conversa (cria ou actualiza)
    const sb = context.supabase;
    const novas = [
      ...data.history,
      { role: "user" as const, content: data.question },
      { role: "assistant" as const, content },
    ];
    let conversaId = data.conversaId ?? null;
    try {
      if (conversaId) {
        await sb.from("assistente_conversas")
          .update({ mensagens: novas, updated_at: new Date().toISOString() })
          .eq("id", conversaId)
          .eq("user_id", context.userId);
      } else {
        const titulo = data.question.slice(0, 80);
        const { data: ins } = await sb.from("assistente_conversas")
          .insert({ user_id: context.userId, titulo, mensagens: novas })
          .select("id")
          .single();
        conversaId = ins?.id ?? null;
      }
    } catch (e) {
      console.error("[assistente] persistência falhou", e);
    }

    return { content, provedor: ativo.provedor, model: ativo.default_model, conversaId };
  });

// Histórico (últimos 7 dias) do utilizador, com auto-limpeza best-effort.
export const listConversas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await context.supabase
      .from("assistente_conversas")
      .delete()
      .lt("updated_at", since)
      .eq("user_id", context.userId);
    const { data, error } = await context.supabase
      .from("assistente_conversas")
      .select("id, titulo, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("assistente_conversas")
      .select("id, titulo, mensagens, updated_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assistente_conversas")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

