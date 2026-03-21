import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

const updateContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

async function getAuthedContact(userId: string, teamId: string | null, contactId: string) {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) return { error: "Contact not found", status: 404 as const };
  const userIds = await getTeamUserIds(userId, teamId);
  if (!userIds.includes(contact.userId))
    return { error: "Interdit", status: 403 as const };

  return { contact };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getAuthedContact(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { opportunities: true },
        },
      },
    });

    return Response.json({
      data: {
        ...contact,
        tags: contact!.tags.map((t) => t.tag),
        opportunitiesCount: contact!._count.opportunities,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error("Get contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getAuthedContact(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const contact = await db.contact.update({
      where: { id },
      data: parsed.data,
      include: { tags: { include: { tag: true } } },
    });

    return Response.json({
      data: {
        ...contact,
        tags: contact.tags.map((t) => t.tag),
      },
    });
  } catch (error) {
    console.error("Update contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getAuthedContact(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    await db.contact.delete({ where: { id } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
