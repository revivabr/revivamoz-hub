import { describe, it, expect } from "vitest";
import {
  MODELOS_POR_PROVEDOR,
  PROVEDOR_LABEL,
  normalizeAiModelId,
  modelValueForProvider,
  modelOptionsForProvider,
} from "./ai-models";

describe("ai-models catalog", () => {
  it("exposes a label for every provider", () => {
    for (const p of Object.keys(MODELOS_POR_PROVEDOR)) {
      expect(PROVEDOR_LABEL[p as keyof typeof PROVEDOR_LABEL]).toBeTruthy();
    }
  });
  it("opencode_go ids are all prefixed", () => {
    for (const m of MODELOS_POR_PROVEDOR.opencode_go) {
      expect(m.startsWith("opencode-go/")).toBe(true);
    }
  });
});

describe("normalizeAiModelId", () => {
  it("strips opencode-go/ prefix", () => {
    expect(normalizeAiModelId("opencode_go", "opencode-go/glm-5.2")).toBe("glm-5.2");
  });
  it("returns value unchanged when not prefixed", () => {
    expect(normalizeAiModelId("opencode_go", "glm-5.2")).toBe("glm-5.2");
  });
  it("returns model untouched for openai", () => {
    expect(normalizeAiModelId("openai", "gpt-5")).toBe("gpt-5");
  });
  it("returns model untouched for gemini", () => {
    expect(normalizeAiModelId("gemini", "gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });
});

describe("modelValueForProvider", () => {
  it("adds opencode-go/ prefix when missing", () => {
    expect(modelValueForProvider("opencode_go", "glm-5.2")).toBe("opencode-go/glm-5.2");
  });
  it("keeps prefix when already present", () => {
    expect(modelValueForProvider("opencode_go", "opencode-go/glm-5.2")).toBe("opencode-go/glm-5.2");
  });
  it("is identity for openai/gemini", () => {
    expect(modelValueForProvider("openai", "gpt-4o")).toBe("gpt-4o");
    expect(modelValueForProvider("gemini", "gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });
});

describe("modelOptionsForProvider", () => {
  it("returns base catalog when no current model", () => {
    expect(modelOptionsForProvider("openai")).toEqual(MODELOS_POR_PROVEDOR.openai);
  });
  it("prepends current model when not in catalog", () => {
    const out = modelOptionsForProvider("openai", "gpt-custom");
    expect(out[0]).toBe("gpt-custom");
    expect(out.length).toBe(MODELOS_POR_PROVEDOR.openai.length + 1);
  });
  it("does not duplicate when current already in catalog", () => {
    const out = modelOptionsForProvider("openai", "gpt-4o");
    expect(out).toEqual(MODELOS_POR_PROVEDOR.openai);
  });
  it("normalizes opencode-go current before comparing", () => {
    const out = modelOptionsForProvider("opencode_go", "glm-5.2");
    expect(out).toEqual(MODELOS_POR_PROVEDOR.opencode_go);
  });
});
