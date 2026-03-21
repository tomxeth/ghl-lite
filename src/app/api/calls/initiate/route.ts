import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initiateCall } from "@/lib/twilio";

const initiateCallSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
});

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = initiateCallSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { contactId } = parsed.data;

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

    const twilioSid = await initiateCall(contact.phone);

    const contactName = `${contact.firstName} ${contact.lastName}`;

    const [call] = await Promise.all([
      db.call.create({
        data: {
          userId: user.id,
          contactId,
          direction: "outbound",
          status: "initiated",
          twilioSid,
        },
      }),
      db.activity.create({
        data: {
          userId: user.id,
          contactId,
          type: "call",
          description: `Called ${contactName}`,
        },
      }),
    ]);

    return Response.json({ data: call }, { status: 201 });
  } catch (error) {
    console.error("Initiate call error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
