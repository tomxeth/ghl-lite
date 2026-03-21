import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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
