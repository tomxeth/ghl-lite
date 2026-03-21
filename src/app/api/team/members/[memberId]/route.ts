import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.teamId) {
      return Response.json({ error: "You are not in a team" }, { status: 400 });
    }

    if (user.role !== "owner") {
      return Response.json(
        { error: "Only the team owner can change roles" },
        { status: 403 }
      );
    }

    const { memberId } = await params;

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    // Cannot change own role
    if (memberId === user.id) {
      return Response.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Verify member is in the same team
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== user.teamId) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id: memberId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return Response.json({ data: updated });
  } catch (error) {
    console.error("Update member role error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.teamId) {
      return Response.json({ error: "You are not in a team" }, { status: 400 });
    }

    if (!["owner", "admin"].includes(user.role)) {
      return Response.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    const { memberId } = await params;

    // Cannot remove yourself
    if (memberId === user.id) {
      return Response.json(
        { error: "You cannot remove yourself from the team" },
        { status: 400 }
      );
    }

    // Verify member is in the same team
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== user.teamId) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove the owner
    if (member.role === "owner") {
      return Response.json(
        { error: "Cannot remove the team owner" },
        { status: 400 }
      );
    }

    // Admins cannot remove other admins
    if (user.role === "admin" && member.role === "admin") {
      return Response.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id: memberId },
      data: { teamId: null, role: "owner" },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error("Remove member error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
