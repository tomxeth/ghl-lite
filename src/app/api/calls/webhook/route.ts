import { db } from "@/lib/db";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Verify Twilio webhook signature
    const twilioSignature = request.headers.get("X-Twilio-Signature") || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const webhookUrl = `${process.env.APP_BASE_URL}/api/calls/webhook`;
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value as string;
      });
      if (!twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)) {
        console.error("Call webhook: invalid Twilio signature");
        return new Response("", { status: 403 });
      }
    } else {
      console.warn("Call webhook: TWILIO_AUTH_TOKEN not set, skipping signature verification");
    }
    const callSid = formData.get("CallSid") as string | null;
    const callStatus = formData.get("CallStatus") as string | null;
    const callDuration = formData.get("CallDuration") as string | null;
    const recordingUrl = formData.get("RecordingUrl") as string | null;

    if (callSid && callStatus) {
      const updateData: Record<string, unknown> = {
        status: callStatus,
      };

      if (callDuration) {
        updateData.duration = parseInt(callDuration, 10);
      }

      if (recordingUrl) {
        updateData.recordingUrl = recordingUrl;
      }

      await db.call.updateMany({
        where: { twilioSid: callSid },
        data: updateData,
      });
    }

    // Twilio expects an empty 200
    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Call webhook error:", error);
    return new Response("", { status: 200 });
  }
}
