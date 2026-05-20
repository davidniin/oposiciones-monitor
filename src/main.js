import { fetchOffers } from "./scraper.js";
import {
  loadState,
  saveState,
  diffNewOffers,
  markSeen,
} from "./stateManager.js";
import { sendNewOffersEmail } from "./notifier.js";
import { recordSuccess, recordFailure } from "./errorHandler.js";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function getEnv(name, { required = true } = {}) {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value ?? "";
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const apiKey = getEnv("RESEND_API_KEY", { required: !dryRun });
  const recipient = getEnv("RECIPIENT_EMAIL", { required: !dryRun });
  const techEmail = getEnv("TECH_EMAIL", { required: false });

  console.log(`[main] starting${dryRun ? " (DRY-RUN)" : ""}`);

  const state = await loadState();
  console.log(
    `[main] loaded state: ${state.seenIds.size} seen ids, ${state.consecutiveFailures} consecutive failures, last run ${state.lastRunIso ?? "never"}`,
  );

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    await recordFailure({ state, error: err, techEmail, apiKey, dryRun });
    if (!dryRun) await saveState(state);
    console.error(`[main] scraper failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`[main] scraper returned ${offers.length} offers`);

  if (offers.length === 0) {
    const err = new Error("scraper returned 0 offers (anomaly)");
    await recordFailure({ state, error: err, techEmail, apiKey, dryRun });
    if (!dryRun) await saveState(state);
    console.warn(`[main] anomaly: 0 offers parsed`);
    return;
  }

  recordSuccess(state);

  const currentIds = offers.map((o) => o.id);
  const newIds = diffNewOffers(currentIds, state);
  const newOffers = offers.filter((o) => newIds.includes(o.id));

  console.log(`[main] ${newOffers.length} new offers detected`);

  const isFirstRun = state.seenIds.size === 0;
  if (isFirstRun) {
    console.log(`[main] first run — marking all ${offers.length} offers as seen without notifying`);
    markSeen(state, currentIds);
    if (!dryRun) await saveState(state);
    return;
  }

  if (newOffers.length > 0) {
    await sendNewOffersEmail({ offers: newOffers, recipient, apiKey, dryRun });
    markSeen(state, newIds);
  }

  if (!dryRun) {
    await saveState(state);
    console.log(`[main] state saved`);
  } else {
    console.log(`[main] DRY-RUN — state NOT saved`);
  }
}

main().catch((err) => {
  console.error(`[main] unexpected error: ${err.stack ?? err.message}`);
  process.exit(1);
});
