import { db } from "@/lib/db";
import { verifyMailgunWebhook } from "@/lib/mailgun";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const signature = json.signature;
    const eventData = json["event-data"];

    // Verify webhook signature
    if (
      !signature ||
      !verifyMailgunWebhook(
        signature.timestamp,
        signature.token,
        signature.signature
      )
    ) {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
    }

    if (!eventData) {
      return new Response("", { status: 200 });
    }

    const event = eventData.event;
    const messageId = eventData.message?.headers?.["message-id"];

    if (!messageId) {
      return new Response("", { status: 200 });
    }

    const emailMessage = await db.emailMessage.findFirst({
      where: { messageId },
    });

    if (!emailMessage) {
      return new Response("", { status: 200 });
    }

    const updateData: Record<string, unknown> = {};

    switch (event) {
      case "delivered":
        updateData.status = "delivered";
        break;
      case "opened":
        updateData.status = "opened";
        updateData.openedAt = new Date();
        break;
      case "clicked":
        updateData.status = "clicked";
        updateData.clickedAt = new Date();
        break;
      case "failed":
      case "rejected":
        updateData.status = "failed";
        break;
      default:
        return new Response("", { status: 200 });
    }

    await db.emailMessage.update({
      where: { id: emailMessage.id },
      data: updateData,
    });

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Email webhook error:", error);
    return new Response("", { status: 200 });
  }
}
