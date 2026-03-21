import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contactId, noteId } = await params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.contactId !== contactId) {
      return Response.json(
        { error: "Note does not belong to this contact" },
        { status: 403 }
      );
    }

    await db.note.delete({ where: { id: noteId } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete note error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
