import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const updateOpportunitySchema = z.object({
  title: z.string().min(1).optional(),
  stageId: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
});

async function getAuthedOpportunity(userId: string, opportunityId: string) {
  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity)
    return { error: "Opportunity not found", status: 404 as const };
  if (opportunity.userId !== userId)
    return { error: "Forbidden", status: 403 as const };

  return { opportunity };
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
    const result = await getAuthedOpportunity(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const opportunity = await db.opportunity.findUnique({
      where: { id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            position: true,
            pipeline: {
              select: {
                id: true,
                name: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                    position: true,
                  },
                  orderBy: { position: "asc" },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    return Response.json({ data: opportunity });
  } catch (error) {
    console.error("Get opportunity error:", error);
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
    const result = await getAuthedOpportunity(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = updateOpportunitySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.value !== undefined) updateData.value = parsed.data.value;
    if (parsed.data.currency !== undefined)
      updateData.currency = parsed.data.currency;
    if (parsed.data.stageId !== undefined)
      updateData.stageId = parsed.data.stageId;
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === "won" || parsed.data.status === "lost") {
        updateData.closedAt = new Date();
      } else {
        updateData.closedAt = null;
      }
    }

    const opportunity = await db.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    return Response.json({ data: opportunity });
  } catch (error) {
    console.error("Update opportunity error:", error);
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
    const result = await getAuthedOpportunity(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    await db.opportunity.delete({ where: { id } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete opportunity error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
