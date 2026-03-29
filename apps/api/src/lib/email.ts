// ============================================================
// apps/api/src/lib/email.ts
//
// Email sender — uses Resend API when RESEND_API_KEY is set,
// falls back to nodemailer SMTP when SMTP_* vars are set,
// gracefully no-ops when neither is configured.
// ============================================================

import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { EmailTemplate } from "./email-templates.js";

const resendApiKey = process.env["RESEND_API_KEY"];
const smtpHost = process.env["SMTP_HOST"];
const smtpPort = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
const smtpUser = process.env["SMTP_USER"];
const smtpPass = process.env["SMTP_PASS"];
export const fromAddress = process.env["SMTP_FROM"] ?? "SafeMeet <onboarding@resend.dev>";

export const emailEnabled = Boolean(resendApiKey || (smtpHost && smtpUser && smtpPass));

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const smtpTransport =
  !resendApiKey && smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      })
    : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (resend) {
    await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
    });
    return;
  }
  if (smtpTransport) {
    await smtpTransport.sendMail({ from: fromAddress, ...opts });
  }
}

export async function sendTemplate(to: string, template: EmailTemplate): Promise<void> {
  await sendEmail({ to, subject: template.subject, text: template.text, html: template.html });
}
