import nodemailer from "nodemailer";

import { SEARCH_URL } from "./scraper.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createTransport(gmailUser, gmailPass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
}

export async function sendNewOffersEmail({
  offers,
  recipients,
  gmailUser,
  gmailPass,
  dryRun = false,
}) {
  if (!recipients || recipients.length === 0) throw new Error("recipients cannot be empty");
  if (!offers || offers.length === 0) {
    console.warn("[notifier] sendNewOffersEmail called with empty offers, skipping");
    return;
  }

  const count = offers.length;
  const subject =
    count === 1
      ? "🚨 NUEVA OPOSICIÓ EDUCACIÓ SOCIAL — 1 nova convocatòria"
      : `🚨 NUEVAS OPOSICIONES EDUCACIÓ SOCIAL — ${count} novas convocatòries`;

  const html = buildOffersHtml(offers, count);

  if (dryRun) {
    console.log("[DRY-RUN] Would send new offers email");
    console.log(`[DRY-RUN] To: ${recipients.join(", ")}`);
    console.log(`[DRY-RUN] Subject: ${subject}`);
    console.log(`[DRY-RUN] Offers: ${count}`);
    for (const o of offers) {
      console.log(`[DRY-RUN]   - ${o.id} | ${o.title} | ${o.institution} | ${o.deadline}`);
    }
    return;
  }

  const transporter = createTransport(gmailUser, gmailPass);
  await transporter.sendMail({
    from: gmailUser,
    to: recipients.join(", "),
    subject,
    html,
  });
  console.log(`[notifier] Sent new offers email to ${recipients.join(", ")} (${count} offers)`);
}

export async function sendFailureAlertEmail({
  recipient,
  gmailUser,
  gmailPass,
  failureCount,
  lastError,
  dryRun = false,
}) {
  if (!recipient) throw new Error("recipient cannot be empty");

  const subject = `[oposiciones-monitor] Scraper failure x${failureCount}`;
  const truncated =
    lastError.length > 2000 ? lastError.slice(0, 2000) + "\n\n[truncated]" : lastError;

  const text =
    `Oposiciones Monitor — Failure Alert\n\n` +
    `The scraper has failed ${failureCount} consecutive times.\n\n` +
    `Last error:\n${truncated}\n\n` +
    `Investigate the workflow run on GitHub Actions for details.\n`;

  if (dryRun) {
    console.log("[DRY-RUN] Would send failure alert");
    console.log(`[DRY-RUN] To: ${recipient}`);
    console.log(`[DRY-RUN] Subject: ${subject}`);
    console.log(`[DRY-RUN] Body:\n${text}`);
    return;
  }

  const transporter = createTransport(gmailUser, gmailPass);
  await transporter.sendMail({
    from: gmailUser,
    to: recipient,
    subject,
    text,
  });
  console.warn(`[notifier] Sent failure alert to ${recipient} (failures=${failureCount})`);
}

function buildOffersHtml(offers, count) {
  const cards = offers
    .map(
      (o) => `
      <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:14px;background:#ffffff;">
        <h3 style="margin:0 0 10px 0;font-size:18px;font-weight:600;line-height:1.3;">
          <a href="${escapeHtml(o.url)}" style="color:#1a73e8;text-decoration:none;">${escapeHtml(o.title)}</a>
        </h3>
        <p style="margin:4px 0;color:#3c4043;font-size:14px;"><strong>Institució:</strong> ${escapeHtml(o.institution)}</p>
        <p style="margin:4px 0;color:#3c4043;font-size:14px;"><strong>Termini:</strong> ${escapeHtml(o.deadline)}</p>
        <p style="margin:4px 0;color:#3c4043;font-size:14px;"><strong>Estat:</strong> ${escapeHtml(o.status)}</p>
      </div>`,
    )
    .join("");

  const headline =
    count === 1 ? "Nova oposició disponible" : `${count} noves oposicions disponibles`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:24px;">
    <div style="background:#d32f2f;color:#ffffff;padding:24px;border-radius:8px;margin-bottom:20px;text-align:center;">
      <div style="font-size:40px;font-weight:700;line-height:1;">🚨 ${count}</div>
      <div style="font-size:18px;font-weight:500;margin-top:8px;">${escapeHtml(headline)}</div>
    </div>
    <h2 style="color:#202124;font-size:18px;margin:0 0 14px 0;">Detalls de les convocatòries</h2>
    ${cards}
    <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:20px;">
      <p style="margin:8px 0;font-size:14px;">
        <a href="${escapeHtml(SEARCH_URL)}" style="color:#1a73e8;text-decoration:none;">Veure totes les oposicions a CIDO</a>
      </p>
      <p style="margin:8px 0;font-size:12px;color:#9aa0a6;">Email automático generado por el monitor de oposiciones.</p>
    </div>
  </div>
</body>
</html>`;
}
