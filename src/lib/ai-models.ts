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
    // Modelos disponíveis via Opencode-Go (OpenAI-compatible)
    "claude-sonnet-4-5",
    "claude-opus-4-1",
    "claude-haiku-4-5",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-5",
    "gpt-5-mini",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "grok-code",
    "qwen3-coder",
  ],
};

export const PROVEDOR_LABEL: Record<ProvedorTipo, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  opencode_go: "Opencode-Go",
};
