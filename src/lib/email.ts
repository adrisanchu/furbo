import "server-only";
import { Resend } from "resend";

type Email = { to: string; subject: string; html: string; text: string };

let resend: Resend | undefined;

/**
 * Sends a transactional email through Resend. Without RESEND_API_KEY (local
 * dev, CI) the email is printed to the server console instead.
 */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`\n[email:dev] To: ${email.to}\n[email:dev] Subject: ${email.subject}\n${email.text}\n`);
    return;
  }
  resend ??= new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Furbo <onboarding@resend.dev>",
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Minimal branded layout: dark card, one green CTA. */
export function actionEmail({
  title,
  intro,
  cta,
  url,
  footer,
}: {
  title: string;
  intro: string;
  cta: string;
  url: string;
  footer: string;
}): Pick<Email, "html" | "text"> {
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#0b0d10;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#f1f0ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14171c;border:1px solid #252a32;border-radius:20px;padding:32px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:0.06em;color:#2be36b">FURBO</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:700">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.55;color:#c9ced6">${escapeHtml(intro)}</td></tr>
<tr><td style="padding-top:28px"><a href="${safeUrl}" style="display:inline-block;background:#2be36b;color:#04140a;font-weight:700;font-size:15px;text-decoration:none;padding:14px 24px;border-radius:14px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding-top:28px;font-size:13px;line-height:1.5;color:#9aa3ae">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${cta}: ${url}\n\n${footer}`;
  return { html, text };
}
