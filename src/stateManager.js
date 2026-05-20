import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_STATE_PATH = resolve(__dirname, "..", "state", "seen.json");

export function emptyState() {
  return {
    seenIds: new Set(),
    consecutiveFailures: 0,
    lastRunIso: null,
  };
}

export async function loadState(path = DEFAULT_STATE_PATH) {
  try {
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw);
    return {
      seenIds: new Set(Array.isArray(data.seen_ids) ? data.seen_ids : []),
      consecutiveFailures: Number.isFinite(data.consecutive_failures)
        ? data.consecutive_failures
        : 0,
      lastRunIso: data.last_run_iso ?? null,
    };
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`[stateManager] state file not found at ${path}, using empty state`);
    } else {
      console.warn(`[stateManager] failed to parse ${path}: ${err.message}, using empty state`);
    }
    return emptyState();
  }
}

export async function saveState(state, path = DEFAULT_STATE_PATH) {
  state.lastRunIso = new Date().toISOString();

  const data = {
    seen_ids: [...state.seenIds].sort(),
    consecutive_failures: state.consecutiveFailures,
    last_run_iso: state.lastRunIso,
  };

  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmpPath, path);
}

export function diffNewOffers(currentIds, state) {
  return currentIds.filter((id) => !state.seenIds.has(id));
}

export function markSeen(state, ids) {
  for (const id of ids) state.seenIds.add(id);
}
