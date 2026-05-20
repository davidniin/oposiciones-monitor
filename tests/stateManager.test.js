import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emptyState,
  loadState,
  saveState,
  diffNewOffers,
  markSeen,
} from "../src/stateManager.js";

let tmpDir;
let statePath;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "oposicions-test-"));
  statePath = join(tmpDir, "seen.json");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("loadState", () => {
  it("devuelve estado vacío si el archivo no existe", async () => {
    const state = await loadState(statePath);
    expect(state.seenIds.size).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastRunIso).toBeNull();
  });

  it("parsea seen_ids como Set y conserva el resto", async () => {
    await writeFile(
      statePath,
      JSON.stringify({
        seen_ids: ["1", "2", "3"],
        consecutive_failures: 2,
        last_run_iso: "2026-05-19T08:00:00Z",
      }),
    );
    const state = await loadState(statePath);
    expect(state.seenIds).toBeInstanceOf(Set);
    expect([...state.seenIds].sort()).toEqual(["1", "2", "3"]);
    expect(state.consecutiveFailures).toBe(2);
    expect(state.lastRunIso).toBe("2026-05-19T08:00:00Z");
  });

  it("devuelve estado vacío si el JSON está corrupto", async () => {
    await writeFile(statePath, "{ esto no es json");
    const state = await loadState(statePath);
    expect(state.seenIds.size).toBe(0);
  });
});

describe("saveState", () => {
  it("escribe seen_ids ordenados como array y actualiza last_run_iso", async () => {
    const state = emptyState();
    state.seenIds.add("99");
    state.seenIds.add("1");
    state.seenIds.add("50");

    await saveState(state, statePath);

    const written = JSON.parse(await readFile(statePath, "utf8"));
    expect(written.seen_ids).toEqual(["1", "50", "99"]);
    expect(written.last_run_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(state.lastRunIso).toBe(written.last_run_iso);
  });

  it("crea el directorio padre si no existe", async () => {
    const nested = join(tmpDir, "nested", "deep", "seen.json");
    const state = emptyState();
    await saveState(state, nested);
    const written = JSON.parse(await readFile(nested, "utf8"));
    expect(written.seen_ids).toEqual([]);
  });
});

describe("diffNewOffers", () => {
  it("devuelve solo los ids no presentes en state.seenIds", () => {
    const state = emptyState();
    state.seenIds.add("1");
    state.seenIds.add("2");
    expect(diffNewOffers(["2", "3", "4"], state)).toEqual(["3", "4"]);
  });

  it("preserva el orden de current_ids", () => {
    const state = emptyState();
    expect(diffNewOffers(["c", "a", "b"], state)).toEqual(["c", "a", "b"]);
  });
});

describe("markSeen", () => {
  it("añade ids al set", () => {
    const state = emptyState();
    markSeen(state, ["1", "2", "1"]);
    expect([...state.seenIds].sort()).toEqual(["1", "2"]);
  });
});
