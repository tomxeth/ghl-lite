import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, stageId } = await params;

    const pipeline = await db.pipeline.findUnique({
      where: { id },
    });

    if (!pipeline) {
      return Response.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }
    if (pipeline.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const stage = await db.stage.findUnique({
      where: { id: stageId, pipelineId: id },
      include: { _count: { select: { opportunities: true } } },
    });

    if (!stage) {
      return Response.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stage._count.opportunities > 0) {
      return Response.json(
        {
          error:
            "Cannot delete stage with existing opportunities. Please move them to another stage first.",
        },
        { status: 400 }
      );
    }

    await db.stage.delete({ where: { id: stageId } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete stage error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
