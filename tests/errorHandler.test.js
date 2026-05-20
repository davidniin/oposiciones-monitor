import { describe, it, expect, vi, beforeEach } from "vitest";

const sendFailureAlertEmail = vi.fn();
vi.mock("../src/notifier.js", () => ({
  sendFailureAlertEmail: (...args) => sendFailureAlertEmail(...args),
}));

const { recordSuccess, recordFailure, FAILURE_THRESHOLD } = await import(
  "../src/errorHandler.js"
);
const { emptyState } = await import("../src/stateManager.js");

beforeEach(() => {
  sendFailureAlertEmail.mockReset();
  sendFailureAlertEmail.mockResolvedValue(undefined);
});

describe("recordSuccess", () => {
  it("resetea el contador a 0", () => {
    const state = emptyState();
    state.consecutiveFailures = 5;
    recordSuccess(state);
    expect(state.consecutiveFailures).toBe(0);
  });
});

describe("recordFailure", () => {
  it("incrementa el contador", async () => {
    const state = emptyState();
    await recordFailure({
      state,
      error: new Error("x"),
      techEmail: "t@e.com",
      apiKey: "k",
    });
    expect(state.consecutiveFailures).toBe(1);
  });

  it("no envía email antes del umbral", async () => {
    const state = emptyState();
    state.consecutiveFailures = 1;
    await recordFailure({
      state,
      error: new Error("x"),
      techEmail: "t@e.com",
      apiKey: "k",
    });
    expect(state.consecutiveFailures).toBe(2);
    expect(sendFailureAlertEmail).not.toHaveBeenCalled();
  });

  it("envía email exactamente al alcanzar el umbral", async () => {
    const state = emptyState();
    state.consecutiveFailures = FAILURE_THRESHOLD - 1;
    await recordFailure({
      state,
      error: new Error("boom"),
      techEmail: "t@e.com",
      apiKey: "k",
    });
    expect(state.consecutiveFailures).toBe(FAILURE_THRESHOLD);
    expect(sendFailureAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("no envía email en los fallos 4 y 5, sí en el 6", async () => {
    const state = emptyState();
    state.consecutiveFailures = 3;

    // failure 4
    await recordFailure({ state, error: new Error("e"), techEmail: "t@e.com", apiKey: "k" });
    expect(sendFailureAlertEmail).not.toHaveBeenCalled();

    // failure 5
    await recordFailure({ state, error: new Error("e"), techEmail: "t@e.com", apiKey: "k" });
    expect(sendFailureAlertEmail).not.toHaveBeenCalled();

    // failure 6
    await recordFailure({ state, error: new Error("e"), techEmail: "t@e.com", apiKey: "k" });
    expect(sendFailureAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("no lanza ni envía si techEmail está vacío", async () => {
    const state = emptyState();
    state.consecutiveFailures = FAILURE_THRESHOLD - 1;
    await expect(
      recordFailure({ state, error: new Error("x"), techEmail: "", apiKey: "k" }),
    ).resolves.not.toThrow();
    expect(sendFailureAlertEmail).not.toHaveBeenCalled();
  });

  it("captura errores del notifier sin propagarlos", async () => {
    sendFailureAlertEmail.mockRejectedValueOnce(new Error("resend down"));
    const state = emptyState();
    state.consecutiveFailures = FAILURE_THRESHOLD - 1;
    await expect(
      recordFailure({ state, error: new Error("x"), techEmail: "t@e.com", apiKey: "k" }),
    ).resolves.not.toThrow();
  });

  it("trunca el mensaje de error a 2000 chars", async () => {
    const state = emptyState();
    state.consecutiveFailures = FAILURE_THRESHOLD - 1;
    const longErr = new Error("a".repeat(5000));
    await recordFailure({ state, error: longErr, techEmail: "t@e.com", apiKey: "k" });
    const callArgs = sendFailureAlertEmail.mock.calls[0][0];
    expect(callArgs.lastError.length).toBe(2000);
  });
});
