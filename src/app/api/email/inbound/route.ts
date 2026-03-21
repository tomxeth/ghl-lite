import { db } from "@/lib/db";
import { verifyMailgunWebhook } from "@/lib/mailgun";
import { getTeamUserIds } from "@/lib/auth";

function extractEmail(raw: string): string {
  // Handle "Name <email@example.com>" format
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return raw.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const sender = (formData.get("sender") as string) || "";
    const from = (formData.get("from") as string) || "";
    const subject = (formData.get("subject") as string) || "(sans objet)";
    const bodyPlain = (formData.get("body-plain") as string) || "";
    const strippedText = (formData.get("stripped-text") as string) || "";
    const recipient = (formData.get("recipient") as string) || "";
    const timestamp = (formData.get("timestamp") as string) || "";
    const token = (formData.get("token") as string) || "";
    const signature = (formData.get("signature") as string) || "";

    // Verify webhook signature
    if (!timestamp || !token || !signature) {
      console.error("Inbound email webhook: missing signature fields");
      return Response.json({ success: true }, { status: 200 });
    }

    if (!verifyMailgunWebhook(timestamp, token, signature)) {
      console.error("Inbound email webhook: invalid signature");
      return Response.json({ success: true }, { status: 200 });
    }

    // Extract sender email address
    const senderEmail = extractEmail(sender || from);
    if (!senderEmail) {
      console.error("Inbound email webhook: no sender email found");
      return Response.json({ success: true }, { status: 200 });
    }

    // Extract recipient to find the CRM user
    const recipientEmail = extractEmail(recipient);
    const localPart = recipientEmail.split("@")[0] || "";

    // Find user by matching name to the local part of the recipient email
    const user = await db.user.findFirst({
      where: { name: { contains: localPart, mode: "insensitive" } },
    });

    if (!user) {
      console.warn(`Inbound email: no user found for recipient ${recipientEmail}`);
      return Response.json({ success: true, skipped: true }, { status: 200 });
    }

    // Find or create contact by sender email (scoped to user's team)
    const userIds = await getTeamUserIds(user.id, user.teamId);
    let contact = await db.contact.findFirst({
      where: { email: senderEmail, userId: { in: userIds } },
    });

    if (!contact) {
      const firstName = senderEmail.split("@")[0] || "Inconnu";
      contact = await db.contact.create({
        data: {
          userId: user.id,
          firstName,
          lastName: "",
          email: senderEmail,
          source: "email",
        },
      });
    }

    // Create EmailMessage (inbound)
    const emailBody = strippedText || bodyPlain;

    await Promise.all([
      db.emailMessage.create({
        data: {
          userId: user.id,
          contactId: contact.id,
          direction: "inbound",
          subject,
          body: emailBody,
          status: "received",
        },
      }),
      db.activity.create({
        data: {
          userId: user.id,
          contactId: contact.id,
          type: "email",
          description: `Email reçu: ${subject}`,
        },
      }),
    ]);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Inbound email webhook error:", error);
    // Always return 200 to prevent Mailgun retries
    return Response.json({ success: true }, { status: 200 });
  }
}
