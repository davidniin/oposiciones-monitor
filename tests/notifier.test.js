import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailMock = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
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

const creds = { gmailUser: "bot@gmail.com", gmailPass: "apppassword" };

beforeEach(() => {
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: "msg-123" });
});

describe("sendNewOffersEmail", () => {
  it("lanza si recipients está vacío", async () => {
    await expect(
      sendNewOffersEmail({ offers: [sampleOffer], recipients: [], ...creds }),
    ).rejects.toThrow(/recipients/);
  });

  it("no llama a nodemailer en dryRun", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer],
      recipients: ["novia@example.com"],
      ...creds,
      dryRun: true,
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("usa asunto plural cuando hay varias ofertas", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer, { ...sampleOffer, id: "2" }],
      recipients: ["novia@example.com"],
      ...creds,
    });
    expect(sendMailMock).toHaveBeenCalledOnce();
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toContain("2 novas");
    expect(arg.to).toBe("novia@example.com");
    expect(arg.html).toContain("Educador/a social");
  });

  it("envía a múltiples destinatarios", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer],
      recipients: ["a@example.com", "b@example.com"],
      ...creds,
    });
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe("a@example.com, b@example.com");
  });

  it("usa asunto singular cuando hay una oferta", async () => {
    await sendNewOffersEmail({
      offers: [sampleOffer],
      recipients: ["novia@example.com"],
      ...creds,
    });
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toContain("1 nova");
  });

  it("propaga el error si nodemailer falla", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("auth failed"));
    await expect(
      sendNewOffersEmail({
        offers: [sampleOffer],
        recipients: ["novia@example.com"],
        ...creds,
      }),
    ).rejects.toThrow(/auth failed/);
  });

  it("escapa HTML en campos de la oferta", async () => {
    const malicious = {
      ...sampleOffer,
      title: "<script>alert(1)</script>",
    };
    await sendNewOffersEmail({
      offers: [malicious],
      recipients: ["novia@example.com"],
      ...creds,
    });
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.html).not.toContain("<script>alert(1)</script>");
    expect(arg.html).toContain("&lt;script&gt;");
  });

  it("no envía email cuando offers está vacío", async () => {
    await sendNewOffersEmail({
      offers: [],
      recipients: ["novia@example.com"],
      ...creds,
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});

describe("sendFailureAlertEmail", () => {
  it("envía email de texto plano con el contador de fallos", async () => {
    await sendFailureAlertEmail({
      recipient: "tech@example.com",
      ...creds,
      failureCount: 3,
      lastError: "boom",
    });
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toContain("x3");
    expect(arg.text).toContain("boom");
  });

  it("trunca errores muy largos a 2000 chars", async () => {
    const longError = "a".repeat(5000);
    await sendFailureAlertEmail({
      recipient: "tech@example.com",
      ...creds,
      failureCount: 3,
      lastError: longError,
    });
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.text).toContain("[truncated]");
    expect(arg.text.length).toBeLessThan(longError.length);
  });
});
