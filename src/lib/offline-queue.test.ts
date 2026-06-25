import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock supabase client used by offline-queue.
const insertMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: (...a: unknown[]) => insertMock(...a) }) },
}));

import { getPending, queueLancamento, flushQueue } from "./offline-queue";

const KEY = "revivamoz.offline.lancamentos";

const base = {
  projeto_id: "p1",
  data: "2026-01-01",
  tipo: "saida" as const,
  valor: 100,
  descricao: "Teste",
  categoria_id: null,
  etapa_id: null,
  created_by: "u1",
};

beforeEach(() => {
  localStorage.clear();
  insertMock.mockReset();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("offline-queue", () => {
  it("starts empty", () => {
    expect(getPending()).toEqual([]);
  });

  it("queueLancamento persists with localId + created_at", () => {
    queueLancamento(base);
    const items = getPending();
    expect(items).toHaveLength(1);
    expect(items[0].localId).toBeTruthy();
    expect(items[0].created_at).toBeTruthy();
    expect(items[0].projeto_id).toBe("p1");
  });

  it("queue survives reload by reading from localStorage", () => {
    queueLancamento(base);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(1);
  });

  it("tolerates corrupted localStorage gracefully", () => {
    localStorage.setItem(KEY, "{not json");
    expect(getPending()).toEqual([]);
  });

  it("flushQueue returns zeros when nothing pending", async () => {
    await expect(flushQueue()).resolves.toEqual({ ok: 0, failed: 0 });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("flushQueue no-ops when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    queueLancamento(base);
    await expect(flushQueue()).resolves.toEqual({ ok: 0, failed: 0 });
    expect(insertMock).not.toHaveBeenCalled();
    expect(getPending()).toHaveLength(1);
  });

  it("flushQueue inserts pending rows and clears them on success", async () => {
    insertMock.mockResolvedValue({ error: null });
    queueLancamento(base);
    queueLancamento({ ...base, valor: 200 });
    const res = await flushQueue();
    expect(res).toEqual({ ok: 2, failed: 0 });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(getPending()).toEqual([]);
  });

  it("flushQueue keeps failed items and reports counts", async () => {
    insertMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "boom" } });
    queueLancamento(base);
    queueLancamento({ ...base, valor: 200 });
    const res = await flushQueue();
    expect(res).toEqual({ ok: 1, failed: 1 });
    expect(getPending()).toHaveLength(1);
    expect(getPending()[0].valor).toBe(200);
  });

  it("flushQueue strips localId and created_at before insert", async () => {
    insertMock.mockResolvedValue({ error: null });
    queueLancamento(base);
    await flushQueue();
    const payload = insertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("localId");
    expect(payload).not.toHaveProperty("created_at");
    expect(payload.projeto_id).toBe("p1");
  });
});
