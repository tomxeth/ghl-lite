import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

const createOpportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  contactId: z.string().min(1, "Contact is required"),
  stageId: z.string().min(1, "Stage is required"),
  value: z.number().min(0).default(0),
  currency: z.string().default("USD"),
});

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const pipelineId = searchParams.get("pipelineId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    const userIds = await getTeamUserIds(user.id, user.teamId);
    const where: Record<string, unknown> = { userId: { in: userIds } };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (pipelineId) {
      where.stage = { pipelineId };
    }

    const [opportunities, total] = await Promise.all([
      db.opportunity.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
              pipeline: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.opportunity.count({ where }),
    ]);

    return Response.json({ data: { opportunities, total } });
  } catch (error) {
    console.error("List opportunities error:", error);
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
    const parsed = createOpportunitySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, contactId, stageId, value, currency } = parsed.data;

    // Verify contact belongs to user
    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== user.id) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }

    // Verify stage belongs to user's pipeline
    const stage = await db.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });
    if (!stage || stage.pipeline.userId !== user.id) {
      return Response.json({ error: "Stage not found" }, { status: 404 });
    }

    const opportunity = await db.opportunity.create({
      data: {
        userId: user.id,
        contactId,
        stageId,
        title,
        value,
        currency,
        status: "open",
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    return Response.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
