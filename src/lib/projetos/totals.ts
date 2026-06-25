// Totais financeiros/físicos derivados de lançamentos e etapas.
import type { Lancamento, Etapa, Projeto } from "./types";

export interface ProjetoTotals {
  entradas: number;
  saidas: number;
  saldo: number;
  consumido: number;
  orc: number;
  progressoFisico: number;
}

export function computeTotals(
  lancamentos: Lancamento[],
  etapas: Etapa[],
  projeto: Pick<Projeto, "orcamento"> | null | undefined,
): ProjetoTotals {
  const entradas = lancamentos
    .filter((l) => l.tipo === "entrada")
    .reduce((s, l) => s + Number(l.valor), 0);
  const saidas = lancamentos
    .filter((l) => l.tipo === "saida")
    .reduce((s, l) => s + Number(l.valor), 0);
  const orc = Number(projeto?.orcamento ?? 0);
  const consumido = orc > 0 ? Math.min(100, (saidas / orc) * 100) : 0;

  const pesoTotal = etapas.reduce((s, e) => s + Number(e.peso), 0);
  const progressoFisico = etapas.length && pesoTotal > 0
    ? (etapas.reduce((s, e) => s + (Number(e.peso) * Number(e.progresso)) / 100, 0) / pesoTotal) * 100
    : 0;

  return { entradas, saidas, saldo: entradas - saidas, consumido, orc, progressoFisico };
}

export function formatMoney(value: number, moeda: string) {
  return `${Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 2 })} ${moeda}`;
}
