import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

const transporter =
  env.emailUser && env.emailPass
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.emailUser,
          pass: env.emailPass,
        },
      })
    : null;

if (!transporter) {
  logger.warn("EMAIL and PASS are not set, so password reset emails will not be sent");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(input: {
  to: string;
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  if (!transporter) {
    // Handy while developing without a mail account. Never print the link in production.
    if (env.nodeEnv !== "production") {
      logger.info({ resetUrl: input.resetUrl }, "Password reset link (email is not configured)");
    }
    return;
  }

  const name = escapeHtml(input.displayName);
  const url = escapeHtml(input.resetUrl);

  await transporter.sendMail({
    from: `"LifeLedger" <${env.emailUser}>`,
    to: input.to,
    subject: "Reset your LifeLedger password",
    text: [
      `Hi ${input.displayName},`,
      "",
      "We received a request to reset your LifeLedger password. Open this link to choose a new one:",
      input.resetUrl,
      "",
      `The link works once and expires in ${input.expiresInMinutes} minutes.`,
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your LifeLedger password. Click the button below to choose a new one.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#10b981;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Choose a new password</a>
        </p>
        <p style="font-size:14px;color:#6b7280">The link works once and expires in ${input.expiresInMinutes} minutes.</p>
        <p style="font-size:14px;color:#6b7280">If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all">${url}</span></p>
        <p style="font-size:14px;color:#6b7280">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
      </div>`,
  });
}
