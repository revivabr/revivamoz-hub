// Catálogo de modelos disponíveis por provedor de IA.
// O Super Admin escolhe o modelo padrão em Configurações → IA;
// os utilizadores podem alternar no Assistente e na página de Inteligência.

export type ProvedorTipo = "openai" | "gemini" | "opencode_go";

export const MODELOS_POR_PROVEDOR: Record<ProvedorTipo, string[]> = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.4-pro",
  ],
  gemini: [
    // IDs OpenAI-compatíveis aceites pelo endpoint /v1beta/openai
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ],
  opencode_go: [
    // Modelos oficiais Opencode-Go (https://opencode.ai/zen/go/v1/models)
    // Na configuração do OpenCode, os IDs usam o formato opencode-go/<model-id>.
    // OpenAI-compatible endpoint (/v1/chat/completions)
    "opencode-go/glm-5.2",
    "opencode-go/glm-5.1",
    "opencode-go/kimi-k2.7-code",
    "opencode-go/kimi-k2.6",
    "opencode-go/mimo-v2.5",
    "opencode-go/mimo-v2.5-pro",
    "opencode-go/minimax-m3",
    "opencode-go/minimax-m2.7",
    "opencode-go/qwen3.7-max",
    "opencode-go/qwen3.7-plus",
    "opencode-go/qwen3.6-plus",
    "opencode-go/deepseek-v4-pro",
    "opencode-go/deepseek-v4-flash",
    // Anthropic-compatible endpoint (/v1/messages)
  ],
};

export const PROVEDOR_LABEL: Record<ProvedorTipo, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  opencode_go: "Opencode-Go",
};

export function normalizeAiModelId(provedor: ProvedorTipo, model: string) {
  if (provedor !== "opencode_go") return model;
  return model.replace(/^opencode-go\//, "");
}

export function modelValueForProvider(provedor: ProvedorTipo, model: string) {
  if (provedor !== "opencode_go") return model;
  return model.startsWith("opencode-go/") ? model : `opencode-go/${model}`;
}

export function modelOptionsForProvider(provedor: ProvedorTipo, currentModel?: string | null) {
  const options = MODELOS_POR_PROVEDOR[provedor];
  if (!currentModel) return options;
  const current = modelValueForProvider(provedor, currentModel);
  return options.includes(current) ? options : [current, ...options];
}
