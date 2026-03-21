import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendSms } from "@/lib/twilio";

const sendSmsSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  body: z.string().min(1, "Message body is required"),
});

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = sendSmsSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { contactId, body } = parsed.data;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!contact.phone) {
      return Response.json(
        { error: "Contact has no phone number" },
        { status: 400 }
      );
    }

    const twilioSid = await sendSms(contact.phone, body);

    const truncated =
      body.length > 50 ? body.substring(0, 50) + "..." : body;

    const [message] = await Promise.all([
      db.smsMessage.create({
        data: {
          userId: user.id,
          contactId,
          direction: "outbound",
          body,
          status: "sent",
          twilioSid,
        },
      }),
      db.activity.create({
        data: {
          userId: user.id,
          contactId,
          type: "sms",
          description: `Sent SMS: ${truncated}`,
        },
      }),
    ]);

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("Send SMS error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
