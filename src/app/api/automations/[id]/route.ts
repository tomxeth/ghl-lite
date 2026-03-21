import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const stepSchema = z.object({
  action: z.enum([
    "send_email",
    "send_sms",
    "add_tag",
    "remove_tag",
    "move_stage",
    "wait",
  ]),
  config: z.record(z.string(), z.any()),
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  trigger: z
    .enum([
      "deal_stage_change",
      "contact_created",
      "tag_added",
      "appointment_created",
    ])
    .optional(),
  triggerConfig: z.record(z.string(), z.any()).nullable().optional(),
  steps: z.array(stepSchema).optional(),
});

async function getAuthedAutomation(userId: string, automationId: string) {
  const automation = await db.automation.findUnique({
    where: { id: automationId },
  });

  if (!automation)
    return { error: "Automation not found", status: 404 as const };
  if (automation.userId !== userId)
    return { error: "Forbidden", status: 403 as const };

  return { automation };
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
    const result = await getAuthedAutomation(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const automation = await db.automation.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { position: "asc" } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return Response.json({ data: automation });
  } catch (error) {
    console.error("Get automation error:", error);
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
    const result = await getAuthedAutomation(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = updateAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
    if (parsed.data.trigger !== undefined)
      updateData.trigger = parsed.data.trigger;
    if (parsed.data.triggerConfig !== undefined)
      updateData.triggerConfig = parsed.data.triggerConfig;

    // If steps are provided, delete old ones and create new ones
    if (parsed.data.steps) {
      await db.automationStep.deleteMany({ where: { automationId: id } });

      await db.automationStep.createMany({
        data: parsed.data.steps.map((step, index) => ({
          automationId: id,
          position: index,
          action: step.action,
          config: step.config as Prisma.InputJsonValue,
        })),
      });
    }

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
      include: {
        steps: { orderBy: { position: "asc" } },
      },
    });

    return Response.json({ data: automation });
  } catch (error) {
    console.error("Update automation error:", error);
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
    const result = await getAuthedAutomation(user.id, id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    await db.automation.delete({ where: { id } });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete automation error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
