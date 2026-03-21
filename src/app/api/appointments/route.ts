import { z } from "zod";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

const createAppointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const contactId = searchParams.get("contactId");

    // Default to current month if no start/end provided
    const now = new Date();
    const start = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endParam
      ? new Date(endParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const userIds = await getTeamUserIds(user.id, user.teamId);
    const where: {
      userId: { in: string[] };
      startTime: { gte: Date; lte: Date };
      contactId?: string;
    } = {
      userId: { in: userIds },
      startTime: { gte: start, lte: end },
    };

    if (contactId) {
      where.contactId = contactId;
    }

    const appointments = await db.appointment.findMany({
      where,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return Response.json({ data: { appointments } });
  } catch (error) {
    console.error("List appointments error:", error);
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
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, contactId, startTime, endTime, location } =
      parsed.data;

    const start = new Date(startTime);
    const finish = new Date(endTime);

    if (start >= finish) {
      return Response.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        contactId: contactId || null,
        startTime: start,
        endTime: finish,
        location: location || null,
        status: "scheduled",
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create Activity record if contactId provided
    if (contactId) {
      await db.activity.create({
        data: {
          userId: user.id,
          contactId,
          type: "appointment",
          description: `Scheduled: ${title}`,
        },
      });
    }

    return Response.json({ data: appointment }, { status: 201 });
  } catch (error) {
    console.error("Create appointment error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
