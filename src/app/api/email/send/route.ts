import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/mailgun";

const sendEmailSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = sendEmailSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { contactId, subject, body } = parsed.data;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!contact.email) {
      return Response.json(
        { error: "Contact has no email address" },
        { status: 400 }
      );
    }

    // Convert plain text body to simple HTML
    const html = body.replace(/\n/g, "<br>");
    const messageId = await sendEmail(contact.email, subject, html);

    const [message] = await Promise.all([
      db.emailMessage.create({
        data: {
          userId: user.id,
          contactId,
          direction: "outbound",
          subject,
          body,
          status: "sent",
          messageId,
        },
      }),
      db.activity.create({
        data: {
          userId: user.id,
          contactId,
          type: "email",
          description: `Sent email: ${subject}`,
        },
      }),
    ]);

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("Send email error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
