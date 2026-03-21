import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.teamId) {
      return Response.json({ data: null });
    }

    const team = await db.team.findUnique({
      where: { id: user.teamId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return Response.json({ data: team });
  } catch (error) {
    console.error("Get team error:", error);
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

    if (user.teamId) {
      return Response.json(
        { error: "You are already in a team" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const team = await db.team.create({
      data: {
        name,
        members: {
          connect: { id: user.id },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    // Ensure user role is owner
    await db.user.update({
      where: { id: user.id },
      data: { role: "owner" },
    });

    return Response.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error("Create team error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
