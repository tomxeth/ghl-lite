import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const automation = await db.automation.findUnique({
      where: { id },
    });

    if (!automation) {
      return Response.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }
    if (automation.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "25", 10))
    );
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db.automationLog.findMany({
        where: { automationId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.automationLog.count({ where: { automationId: id } }),
    ]);

    return Response.json({
      data: { logs, total, page, limit },
    });
  } catch (error) {
    console.error("List automation logs error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
