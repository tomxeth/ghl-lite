import FormData from "form-data";
import Mailgun from "mailgun.js";
import crypto from "crypto";

function getClient() {
  const key = process.env.MAILGUN_API_KEY;
  if (!key) {
    throw new Error("Mailgun API key not configured. Set MAILGUN_API_KEY.");
  }
  const mailgun = new Mailgun(FormData);
  const url = process.env.MAILGUN_URL || "https://api.eu.mailgun.net";
  return mailgun.client({ username: "api", key, url });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const mg = getClient();
  const result = await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
    from: process.env.MAILGUN_FROM!,
    to,
    subject,
    html,
    "o:tracking": "yes",
    "o:tracking-clicks": "yes",
    "o:tracking-opens": "yes",
  });
  return result.id;
}

export function verifyMailgunWebhook(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY!;
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(timestamp + token);
  return hmac.digest("hex") === signature;
}
