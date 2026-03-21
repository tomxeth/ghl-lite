import { z } from "zod";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";
import { fireAutomation } from "@/lib/automations";
import type { Prisma } from "@prisma/client";

const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const userIds = await getTeamUserIds(user.id, user.teamId);
    const where: Prisma.ContactWhereInput = { userId: { in: userIds } };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { name: { equals: tag, mode: "insensitive" } },
        },
      };
    }

    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.contact.count({ where }),
    ]);

    return Response.json({
      data: {
        contacts: contacts.map((c) => ({
          ...c,
          tags: c.tags.map((t) => t.tag),
        })),
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("List contacts error:", error);
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
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone, company, source, tags } =
      parsed.data;

    const contact = await db.contact.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || null,
        tags: tags?.length
          ? {
              create: await Promise.all(
                tags.map(async (tagName) => {
                  const existingTag = await db.tag.findUnique({
                    where: { name: tagName },
                  });
                  if (existingTag) {
                    return { tag: { connect: { id: existingTag.id } } };
                  }
                  return { tag: { create: { name: tagName } } };
                })
              ),
            }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    // Fire automation trigger (non-blocking)
    fireAutomation("contact_created", {
      userId: user.id,
      contactId: contact.id,
    }).catch((err) => console.error("Automation trigger error:", err));

    return Response.json(
      {
        data: {
          ...contact,
          tags: contact.tags.map((t) => t.tag),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create contact error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
