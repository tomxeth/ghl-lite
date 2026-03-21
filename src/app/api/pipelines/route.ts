import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createPipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  stages: z
    .array(
      z.object({
        name: z.string().min(1, "Stage name is required"),
        color: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pipelines = await db.pipeline.findMany({
      where: { userId: user.id },
      include: {
        stages: { orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: pipelines });
  } catch (error) {
    console.error("List pipelines error:", error);
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
    const parsed = createPipelineSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, stages } = parsed.data;

    const pipeline = await db.pipeline.create({
      data: {
        userId: user.id,
        name,
        stages: stages?.length
          ? {
              create: stages.map((stage, index) => ({
                name: stage.name,
                color: stage.color || "#3B82F6",
                position: index,
              })),
            }
          : undefined,
      },
      include: {
        stages: { orderBy: { position: "asc" } },
      },
    });

    return Response.json({ data: pipeline }, { status: 201 });
  } catch (error) {
    console.error("Create pipeline error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
