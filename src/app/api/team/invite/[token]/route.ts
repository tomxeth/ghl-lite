import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        team: { select: { name: true } },
        sender: { select: { name: true } },
      },
    });

    if (!invite) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return Response.json(
        { error: "This invite has already been used", status: invite.status },
        { status: 410 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return Response.json(
        { error: "This invite has expired", status: "expired" },
        { status: 410 }
      );
    }

    return Response.json({
      data: {
        teamName: invite.team.name,
        inviterName: invite.sender.name,
        role: invite.role,
        email: invite.email,
      },
    });
  } catch (error) {
    console.error("Get invite error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return Response.json(
        { error: "This invite has already been used" },
        { status: 410 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return Response.json(
        { error: "This invite has expired" },
        { status: 410 }
      );
    }

    if (user.teamId) {
      return Response.json(
        { error: "You are already in a team. Leave your current team first." },
        { status: 400 }
      );
    }

    // Accept the invite: update user and invite status in a transaction
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          teamId: invite.teamId,
          role: invite.role,
        },
      }),
      db.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      }),
    ]);

    return Response.json({
      data: {
        teamId: invite.teamId,
        teamName: invite.team.name,
        role: invite.role,
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
