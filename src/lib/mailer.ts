import nodemailer, { type Transporter } from "nodemailer";

// Outgoing email over SMTP (Nodemailer). Configured only from the environment:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for port 465, else STARTTLS),
//   SMTP_USER, SMTP_PASS, MAIL_FROM ('"PharmaCompare" <alerts@example.co.uk>').
// Server-only: never import this from a client component.

let transporter: Transporter | null = null;

export function mailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter() {
  if (!mailerConfigured()) throw new Error("Email is not configured (set SMTP_HOST and MAIL_FROM).");
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export type OutgoingEmail = { to: string; subject: string; text: string; html: string; unsubscribeUrl?: string };

export async function sendEmail({ to, subject, text, html, unsubscribeUrl }: OutgoingEmail) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
    // Lets mail apps show their own "Unsubscribe" button.
    list: unsubscribeUrl ? { unsubscribe: { url: unsubscribeUrl, comment: "Stop this price alert" } } : undefined,
  });
}
