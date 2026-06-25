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
    "gpt-5.4-mini",
    "gpt-5.4-nano",
  ],
  gemini: [
    // IDs OpenAI-compatíveis aceites pelo endpoint /v1beta/openai
    "gemini-3-flash",
    "gemini-3.1-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ],
  opencode_go: [
    // Modelos oficiais Opencode-Go (https://opencode.ai/zen/go/v1/models)
    // OpenAI-compatible endpoint (/v1/chat/completions)
    "glm-5.2",
    "glm-5.1",
    "kimi-k2.7-code",
    "kimi-k2.6",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "mimo-v2.5",
    "mimo-v2.5-pro",
    // Anthropic-compatible endpoint (/v1/messages)
    "minimax-m3",
    "minimax-m2.7",
    "minimax-m2.5",
    "qwen3.7-max",
    "qwen3.7-plus",
    "qwen3.6-plus",
  ],
};

export const PROVEDOR_LABEL: Record<ProvedorTipo, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  opencode_go: "Opencode-Go",
};
