import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, getTeamUserIds } from "@/lib/auth";

const updateAppointmentSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

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
    const userIds = await getTeamUserIds(user.id, user.teamId);

    const appointment = await db.appointment.findFirst({
      where: { id, userId: { in: userIds } },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!appointment) {
      return Response.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: appointment });
  } catch (error) {
    console.error("Get appointment error:", error);
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
    const userIds = await getTeamUserIds(user.id, user.teamId);

    const existing = await db.appointment.findFirst({
      where: { id, userId: { in: userIds } },
    });

    if (!existing) {
      return Response.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      data.description = parsed.data.description || null;
    if (parsed.data.contactId !== undefined)
      data.contactId = parsed.data.contactId || null;
    if (parsed.data.location !== undefined)
      data.location = parsed.data.location || null;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    if (parsed.data.startTime) data.startTime = new Date(parsed.data.startTime);
    if (parsed.data.endTime) data.endTime = new Date(parsed.data.endTime);

    // Validate start < end if both are being set
    const finalStart = (data.startTime as Date) || existing.startTime;
    const finalEnd = (data.endTime as Date) || existing.endTime;

    if (finalStart >= finalEnd) {
      return Response.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.update({
      where: { id },
      data,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return Response.json({ data: appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
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
    const userIds = await getTeamUserIds(user.id, user.teamId);

    const existing = await db.appointment.findFirst({
      where: { id, userId: { in: userIds } },
    });

    if (!existing) {
      return Response.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    await db.appointment.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
