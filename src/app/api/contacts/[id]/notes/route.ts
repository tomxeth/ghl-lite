import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createNoteSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contactId } = await params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const notes = await db.note.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: notes });
  } catch (error) {
    console.error("List notes error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contactId } = await params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const note = await db.note.create({
      data: {
        contactId,
        content: parsed.data.content,
      },
    });

    return Response.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("Create note error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
