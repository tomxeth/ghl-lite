import { db } from "@/lib/db";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Verify Twilio webhook signature
    const twilioSignature = request.headers.get("X-Twilio-Signature") || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const webhookUrl = `${process.env.APP_BASE_URL}/api/sms/webhook`;
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value as string;
      });
      if (!twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)) {
        console.error("SMS webhook: invalid Twilio signature");
        return new Response("", { status: 403 });
      }
    } else {
      console.warn("SMS webhook: TWILIO_AUTH_TOKEN not set, skipping signature verification");
    }
    const messageSid = formData.get("MessageSid") as string | null;
    const messageStatus = formData.get("MessageStatus") as string | null;
    const from = formData.get("From") as string | null;
    const to = formData.get("To") as string | null;
    const body = formData.get("Body") as string | null;

    // Inbound SMS — has a Body field and From is not our number
    if (body && from) {
      const contact = await db.contact.findFirst({
        where: { phone: from },
        include: { user: true },
      });

      if (contact) {
        const truncated =
          body.length > 50 ? body.substring(0, 50) + "..." : body;

        await Promise.all([
          db.smsMessage.create({
            data: {
              userId: contact.userId,
              contactId: contact.id,
              direction: "inbound",
              body,
              status: "received",
              twilioSid: messageSid,
            },
          }),
          db.activity.create({
            data: {
              userId: contact.userId,
              contactId: contact.id,
              type: "sms",
              description: `Received SMS: ${truncated}`,
            },
          }),
        ]);
      }
    }

    // Status callback — update existing message status
    if (messageSid && messageStatus && !body) {
      await db.smsMessage.updateMany({
        where: { twilioSid: messageSid },
        data: { status: messageStatus },
      });
    }

    // Twilio expects an empty 200
    return new Response("", { status: 200 });
  } catch (error) {
    console.error("SMS webhook error:", error);
    return new Response("", { status: 200 });
  }
}
