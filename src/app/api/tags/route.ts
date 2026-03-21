import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tags = await db.tag.findMany({
      orderBy: { name: "asc" },
    });

    return Response.json({ data: tags });
  } catch (error) {
    console.error("List tags error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db.tag.findUnique({
      where: { name: parsed.data.name },
    });

    if (existing) {
      return Response.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await db.tag.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color || "#6B7280",
      },
    });

    return Response.json({ data: tag }, { status: 201 });
  } catch (error) {
    console.error("Create tag error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
