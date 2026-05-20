import { sendFailureAlertEmail } from "./notifier.js";

export const FAILURE_THRESHOLD = 3;

export function recordSuccess(state) {
  if (state.consecutiveFailures > 0) {
    console.log(`[errorHandler] scraper recovered after ${state.consecutiveFailures} failures`);
  }
  state.consecutiveFailures = 0;
}

export async function recordFailure({
  state,
  error,
  techEmail,
  gmailUser,
  gmailPass,
  dryRun = false,
}) {
  state.consecutiveFailures += 1;
  const errorText = (error?.stack ?? error?.message ?? String(error)).slice(0, 2000);
  console.warn(`[errorHandler] failure #${state.consecutiveFailures}: ${errorText}`);

  if (state.consecutiveFailures < FAILURE_THRESHOLD) return;

  const over = state.consecutiveFailures - FAILURE_THRESHOLD;
  if (over % 3 !== 0) return;

  if (!techEmail) {
    console.warn(`[errorHandler] threshold reached but no techEmail configured`);
    return;
  }

  try {
    await sendFailureAlertEmail({
      recipient: techEmail,
      gmailUser,
      gmailPass,
      failureCount: state.consecutiveFailures,
      lastError: errorText,
      dryRun,
    });
  } catch (alertErr) {
    console.error(
      `[errorHandler] failed to send failure alert: ${alertErr.message}. Original error: ${errorText}`,
    );
  }
}
