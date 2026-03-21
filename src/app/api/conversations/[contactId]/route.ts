import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    const userIds = await getTeamUserIds(user.id, user.teamId);
    if (!userIds.includes(contact.userId)) {
      return Response.json({ error: "Interdit" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    const results: Array<{
      id: string;
      kind: "sms" | "email" | "call";
      direction: string;
      createdAt: Date;
      [key: string]: unknown;
    }> = [];

    if (type === "all" || type === "sms") {
      const smsMessages = await db.smsMessage.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
      });
      results.push(
        ...smsMessages.map((m) => ({ ...m, kind: "sms" as const }))
      );
    }

    if (type === "all" || type === "email") {
      const emailMessages = await db.emailMessage.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
      });
      results.push(
        ...emailMessages.map((m) => ({ ...m, kind: "email" as const }))
      );
    }

    if (type === "all" || type === "calls") {
      const calls = await db.call.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
      });
      results.push(
        ...calls.map((c) => ({ ...c, kind: "call" as const }))
      );
    }

    // Sort all results by createdAt desc
    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return Response.json({ data: results });
  } catch (error) {
    console.error("Get conversations error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
