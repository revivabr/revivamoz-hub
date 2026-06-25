// Fila offline simples para lançamentos criados sem ligação.
import { supabase } from "@/integrations/supabase/client";

const KEY = "revivamoz.offline.lancamentos";

export type PendingLancamento = {
  localId: string;
  projeto_id: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao?: string | null;
  categoria_id?: string | null;
  etapa_id?: string | null;
  created_by: string;
  created_at: string;
};

function read(): PendingLancamento[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(rows: PendingLancamento[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event("offline-queue-changed"));
}

export function getPending(): PendingLancamento[] {
  return read();
}
export function queueLancamento(row: Omit<PendingLancamento, "localId" | "created_at">) {
  const all = read();
  all.push({ ...row, localId: crypto.randomUUID(), created_at: new Date().toISOString() });
  write(all);
}

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: 0, failed: 0 };
  const all = read();
  if (!all.length) return { ok: 0, failed: 0 };

  let ok = 0;
  const remaining: PendingLancamento[] = [];
  for (const item of all) {
    const { localId, created_at, ...payload } = item;
    const { error } = await supabase.from("lancamentos").insert(payload);
    if (error) remaining.push(item);
    else ok++;
  }
  write(remaining);
  return { ok, failed: remaining.length };
}

export function installOfflineFlush() {
  if (typeof window === "undefined") return;
  const handler = () => { flushQueue(); };
  window.addEventListener("online", handler);
  // tentativa periódica
  setInterval(handler, 60_000);
  // primeira tentativa
  setTimeout(handler, 2000);
}
