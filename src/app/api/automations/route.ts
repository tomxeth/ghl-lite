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

const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger: z.enum([
    "deal_stage_change",
    "contact_created",
    "tag_added",
    "appointment_created",
  ]),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const automations = await db.automation.findMany({
      where: { userId: user.id },
      include: {
        steps: { orderBy: { position: "asc" } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: automations });
  } catch (error) {
    console.error("List automations error:", error);
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
    const parsed = createAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, trigger, triggerConfig, steps } = parsed.data;

    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name,
        trigger,
        triggerConfig: (triggerConfig as Prisma.InputJsonValue) || undefined,
        steps: {
          create: steps.map((step, index) => ({
            position: index,
            action: step.action,
            config: step.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        steps: { orderBy: { position: "asc" } },
      },
    });

    return Response.json({ data: automation }, { status: 201 });
  } catch (error) {
    console.error("Create automation error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
