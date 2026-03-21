import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

const updatePipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
});

async function getAuthedPipeline(userId: string, teamId: string | null, pipelineId: string) {
  const pipeline = await db.pipeline.findUnique({
    where: { id: pipelineId },
  });

  if (!pipeline) return { error: "Pipeline not found", status: 404 as const };
  const userIds = await getTeamUserIds(userId, teamId);
  if (!userIds.includes(pipeline.userId))
    return { error: "Interdit", status: 403 as const };

  return { pipeline };
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
    const result = await getAuthedPipeline(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const pipeline = await db.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: {
            _count: { select: { opportunities: true } },
          },
        },
      },
    });

    return Response.json({
      data: {
        ...pipeline,
        stages: pipeline!.stages.map((stage) => ({
          ...stage,
          opportunitiesCount: stage._count.opportunities,
          _count: undefined,
        })),
      },
    });
  } catch (error) {
    console.error("Get pipeline error:", error);
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
    const result = await getAuthedPipeline(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = updatePipelineSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const pipeline = await db.pipeline.update({
      where: { id },
      data: { name: parsed.data.name },
      include: {
        stages: { orderBy: { position: "asc" } },
      },
    });

    return Response.json({ data: pipeline });
  } catch (error) {
    console.error("Update pipeline error:", error);
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
    const result = await getAuthedPipeline(user.id, user.teamId, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    await db.pipeline.delete({ where: { id } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete pipeline error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
