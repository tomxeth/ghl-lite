import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contactId, tagId } = await params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tagOnContact = await db.tagOnContact.findUnique({
      where: { contactId_tagId: { contactId, tagId } },
    });

    if (!tagOnContact) {
      return Response.json(
        { error: "Tag not assigned to contact" },
        { status: 404 }
      );
    }

    await db.tagOnContact.delete({
      where: { contactId_tagId: { contactId, tagId } },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Remove tag from contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
