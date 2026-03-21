import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  color: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

const batchUpdateStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      color: z.string().optional(),
      position: z.number().int().min(0),
    })
  ),
});

async function getAuthedPipeline(userId: string, pipelineId: string) {
  const pipeline = await db.pipeline.findUnique({
    where: { id: pipelineId },
  });

  if (!pipeline) return { error: "Pipeline not found", status: 404 as const };
  if (pipeline.userId !== userId)
    return { error: "Forbidden", status: 403 as const };

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
    const result = await getAuthedPipeline(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const stages = await db.stage.findMany({
      where: { pipelineId: id },
      orderBy: { position: "asc" },
    });

    return Response.json({ data: stages });
  } catch (error) {
    console.error("List stages error:", error);
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

    const { id } = await params;
    const result = await getAuthedPipeline(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = createStageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, color, position } = parsed.data;

    let finalPosition = position;
    if (finalPosition === undefined) {
      const lastStage = await db.stage.findFirst({
        where: { pipelineId: id },
        orderBy: { position: "desc" },
      });
      finalPosition = lastStage ? lastStage.position + 1 : 0;
    }

    const stage = await db.stage.create({
      data: {
        pipelineId: id,
        name,
        color: color || "#3B82F6",
        position: finalPosition,
      },
    });

    return Response.json({ data: stage }, { status: 201 });
  } catch (error) {
    console.error("Create stage error:", error);
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
    const result = await getAuthedPipeline(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = batchUpdateStagesSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updates = parsed.data.stages.map((stage) =>
      db.stage.update({
        where: { id: stage.id, pipelineId: id },
        data: {
          ...(stage.name !== undefined && { name: stage.name }),
          ...(stage.color !== undefined && { color: stage.color }),
          position: stage.position,
        },
      })
    );

    await db.$transaction(updates);

    const stages = await db.stage.findMany({
      where: { pipelineId: id },
      orderBy: { position: "asc" },
    });

    return Response.json({ data: stages });
  } catch (error) {
    console.error("Batch update stages error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
