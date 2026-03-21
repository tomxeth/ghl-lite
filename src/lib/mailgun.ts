import crypto from "crypto";

const MAILGUN_BASE = process.env.MAILGUN_URL || "https://api.eu.mailgun.net";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName?: string,
  fromEmail?: string
) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    throw new Error("Mailgun not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN.");
  }

  const from =
    fromName && fromEmail
      ? `${fromName} <${fromEmail}>`
      : process.env.MAILGUN_FROM;

  if (!from) {
    throw new Error("No FROM address: provide fromName/fromEmail or set MAILGUN_FROM.");
  }

  const form = new URLSearchParams();
  form.append("from", from);
  form.append("to", to);
  form.append("subject", subject);
  form.append("html", html);
  form.append("o:tracking", "yes");
  form.append("o:tracking-clicks", "yes");
  form.append("o:tracking-opens", "yes");

  const response = await fetch(`${MAILGUN_BASE}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mailgun error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.id as string;
}

export async function createInboundRoute(webhookUrl: string) {
  const apiKey = process.env.MAILGUN_API_KEY;

  if (!apiKey) {
    throw new Error("Mailgun not configured. Set MAILGUN_API_KEY.");
  }

  const form = new URLSearchParams();
  form.append("priority", "0");
  form.append("description", "GHL Lite inbound email forwarding");
  form.append("expression", "match_recipient('.*@mail.laformuleretour.com')");
  form.append("action", `forward('${webhookUrl}')`);
  form.append("action", "stop()");

  const response = await fetch(`${MAILGUN_BASE}/v3/routes`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mailgun route creation error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data;
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
