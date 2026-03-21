import twilio from "twilio";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  // Verify Twilio webhook signature
  const twilioSignature = request.headers.get("X-Twilio-Signature") || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const webhookUrl = `${process.env.APP_BASE_URL}/api/calls/twiml`;
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value as string;
    });
    if (!twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)) {
      console.error("TwiML endpoint: invalid Twilio signature");
      return new Response("", { status: 403 });
    }
  } else {
    console.warn("TwiML endpoint: TWILIO_AUTH_TOKEN not set, skipping signature verification");
  }

  const to = formData.get("To") as string | null;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(process.env.TWILIO_PHONE_NUMBER || "")}">
    <Number>${escapeXml(to || "")}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
