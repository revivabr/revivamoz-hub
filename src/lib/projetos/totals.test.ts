import { describe, it, expect } from "vitest";
import { computeTotals, formatMoney } from "./totals";
import type { Lancamento, Etapa } from "./types";

const L = (over: Partial<Lancamento>): Lancamento => ({
  id: "x", tipo: "saida", data: "2026-01-01", valor: 0, descricao: null,
  categoria_id: null, etapa_id: null, comprovante_path: null, created_by: "u",
  ...over,
});
const E = (over: Partial<Etapa>): Etapa => ({
  id: "e", nome: "n", descricao: null, ordem: 0, peso: 0, progresso: 0,
  valor_previsto: 0, data_inicio: null, data_fim: null, ...over,
});

describe("computeTotals", () => {
  it("soma entradas e saídas e calcula saldo", () => {
    const t = computeTotals(
      [L({ tipo: "entrada", valor: 100 }), L({ tipo: "saida", valor: 30 })],
      [],
      { orcamento: 200 },
    );
    expect(t.entradas).toBe(100);
    expect(t.saidas).toBe(30);
    expect(t.saldo).toBe(70);
    expect(t.consumido).toBe(15);
  });

  it("limita consumido a 100% quando saídas excedem orçamento", () => {
    const t = computeTotals([L({ valor: 500 })], [], { orcamento: 100 });
    expect(t.consumido).toBe(100);
  });

  it("progresso físico ponderado pelas etapas", () => {
    const t = computeTotals([], [
      E({ peso: 50, progresso: 100 }),
      E({ peso: 50, progresso: 0 }),
    ], { orcamento: 0 });
    expect(t.progressoFisico).toBe(50);
  });

  it("retorna 0 quando não há orçamento nem etapas", () => {
    const t = computeTotals([], [], null);
    expect(t.consumido).toBe(0);
    expect(t.progressoFisico).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formata em pt-PT com moeda", () => {
    expect(formatMoney(1234.5, "MZN")).toMatch(/1.?234,5\s*MZN/);
  });
});
