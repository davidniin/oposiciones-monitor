import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

const { sendNewOffersEmail, sendFailureAlertEmail } = await import("../src/notifier.js");

const sampleOffer = {
  id: "1",
  title: "Educador/a social",
  institution: "Ajuntament de Barcelona",
  deadline: "04/06/2026",
  status: "Termini obert",
  url: "https://cido.diba.cat/oposicions/1/x",
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "msg-123" }, error: null });
});

describe("sendNewOffersEmail", () => {
  it("lanza si recipient está vacío", async () => {
    await expect(
      sendNewOffersEmail({ offers: [sampleOffer], recipient: "", apiKey: "k" }),
    ).rejects.toThrow(/recipient/);
  });

  it("no llama a Resend en dryRun", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer],
      recipient: "novia@example.com",
      apiKey: "key",
      dryRun: true,
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("usa asunto plural cuando hay varias ofertas", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer, { ...sampleOffer, id: "2" }],
      recipient: "novia@example.com",
      apiKey: "key",
    });
    expect(sendMock).toHaveBeenCalledOnce();
    const arg = sendMock.mock.calls[0][0];
    expect(arg.subject).toContain("2 novas");
    expect(arg.to).toEqual(["novia@example.com"]);
    expect(arg.html).toContain("Educador/a social");
  });

  it("usa asunto singular cuando hay una oferta", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer],
      recipient: "novia@example.com",
      apiKey: "key",
    });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.subject).toContain("1 nova");
  });

  it("propaga el error si Resend devuelve error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "rate limit" } });
    await expect(
      sendNewOffersEmail({
        offers: [sampleOffer],
        recipient: "novia@example.com",
        apiKey: "key",
      }),
    ).rejects.toThrow(/rate limit/);
  });

  it("escapa HTML en campos de la oferta", async () => {
    const malicious = {
      ...sampleOffer,
      title: "<script>alert(1)</script>",
    };
    await sendNewOffersEmail({
      offers: [malicious],
      recipient: "novia@example.com",
      apiKey: "key",
    });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("<script>alert(1)</script>");
    expect(arg.html).toContain("&lt;script&gt;");
  });

  it("no envía email cuando offers está vacío", async () => {
    await sendNewOffersEmail({
      offers: [],
      recipient: "novia@example.com",
      apiKey: "key",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendFailureAlertEmail", () => {
  it("envía email de texto plano con el contador de fallos", async () => {
    await sendFailureAlertEmail({
      recipient: "tech@example.com",
      apiKey: "key",
      failureCount: 3,
      lastError: "boom",
    });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.subject).toContain("x3");
    expect(arg.text).toContain("boom");
  });

  it("trunca errores muy largos a 2000 chars", async () => {
    const longError = "a".repeat(5000);
    await sendFailureAlertEmail({
      recipient: "tech@example.com",
      apiKey: "key",
      failureCount: 3,
      lastError: longError,
    });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.text).toContain("[truncated]");
    expect(arg.text.length).toBeLessThan(longError.length);
  });
});
