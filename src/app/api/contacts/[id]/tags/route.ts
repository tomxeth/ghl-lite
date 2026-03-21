import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fireAutomation } from "@/lib/automations";

const addTagSchema = z.union([
  z.object({ tagId: z.string().min(1, "Tag ID is required") }),
  z.object({
    name: z.string().min(1, "Tag name is required"),
    color: z.string().optional(),
  }),
]);

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
    const parsed = addTagSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let tagId: string;

    if ("tagId" in parsed.data) {
      const tag = await db.tag.findUnique({
        where: { id: parsed.data.tagId },
      });
      if (!tag) {
        return Response.json({ error: "Tag not found" }, { status: 404 });
      }
      tagId = tag.id;
    } else {
      const tag = await db.tag.upsert({
        where: { name: parsed.data.name },
        update: {},
        create: {
          name: parsed.data.name,
          color: parsed.data.color || "#6B7280",
        },
      });
      tagId = tag.id;
    }

    // Check if tag is already assigned
    const existing = await db.tagOnContact.findUnique({
      where: { contactId_tagId: { contactId, tagId } },
    });

    if (existing) {
      return Response.json(
        { error: "Tag already assigned to contact" },
        { status: 400 }
      );
    }

    const tagOnContact = await db.tagOnContact.create({
      data: { contactId, tagId },
      include: { tag: true },
    });

    // Fire automation trigger (non-blocking)
    fireAutomation("tag_added", {
      userId: user.id,
      contactId,
      metadata: { tagId: tagOnContact.tag.id, tagName: tagOnContact.tag.name },
    }).catch((err) => console.error("Automation trigger error:", err));

    return Response.json({ data: tagOnContact.tag }, { status: 201 });
  } catch (error) {
    console.error("Add tag to contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
