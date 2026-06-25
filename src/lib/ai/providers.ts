// Strategy pattern para provedores de IA.
// Cada flavor (openai-compatible / anthropic-compatible) implementa a mesma
// interface `ProviderStrategy`, eliminando o switch que existia em ai.functions.ts.

import { normalizeAiModelId, type ProvedorTipo } from "@/lib/ai-models";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage { role: ChatRole; content: string }

export interface ChatRequest {
  provedor: ProvedorTipo;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  apiKey: string;
  baseUrl: string | null;
}

export interface ChatResult {
  content: string;
  endpoint: string;
  flavor: "openai" | "anthropic";
  providerModel: string;
}

// Modelos Opencode-Go que usam endpoint Anthropic-compatible (/v1/messages)
const OPENCODE_ANTHROPIC_MODELS = new Set([
  "minimax-m3",
  "minimax-m2.7",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
]);

const DEFAULT_BASE_URL: Record<ProvedorTipo, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  opencode_go: "https://opencode.ai/zen/go/v1",
};

function resolveBase(provedor: ProvedorTipo, baseUrl: string | null) {
  return (baseUrl ?? DEFAULT_BASE_URL[provedor]).replace(/\/$/, "");
}

function resolveFlavor(provedor: ProvedorTipo, providerModel: string): "openai" | "anthropic" {
  return provedor === "opencode_go" && OPENCODE_ANTHROPIC_MODELS.has(providerModel)
    ? "anthropic"
    : "openai";
}

interface ProviderStrategy {
  buildRequest(req: ChatRequest, providerModel: string): { url: string; init: RequestInit };
  parseResponse(json: unknown): string;
}

const openaiStrategy: ProviderStrategy = {
  buildRequest(req, providerModel) {
    const url = resolveBase(req.provedor, req.baseUrl) + "/chat/completions";
    return {
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${req.apiKey}`,
        },
        body: JSON.stringify({
          model: providerModel,
          messages: req.messages,
          temperature: req.temperature ?? 0.3,
        }),
      },
    };
  },
  parseResponse(json) {
    const j = json as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content ?? "";
  },
};

const anthropicStrategy: ProviderStrategy = {
  buildRequest(req, providerModel) {
    const url = resolveBase(req.provedor, req.baseUrl) + "/messages";
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    return {
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": req.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: providerModel,
          max_tokens: 4096,
          temperature: req.temperature ?? 0.3,
          system: system || undefined,
          messages,
        }),
      },
    };
  },
  parseResponse(json) {
    const j = json as { content?: Array<{ text?: string }> };
    return j.content?.map((c) => c.text ?? "").join("") ?? "";
  },
};

const STRATEGIES: Record<"openai" | "anthropic", ProviderStrategy> = {
  openai: openaiStrategy,
  anthropic: anthropicStrategy,
};

export async function callAiProvider(req: ChatRequest): Promise<ChatResult> {
  const providerModel = normalizeAiModelId(req.provedor, req.model);
  const flavor = resolveFlavor(req.provedor, providerModel);
  const strategy = STRATEGIES[flavor];
  const { url, init } = strategy.buildRequest(req, providerModel);

  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro do provedor (${res.status}): ${txt.slice(0, 400)}`);
  }
  const content = strategy.parseResponse(await res.json());
  return { content, endpoint: url, flavor, providerModel };
}
