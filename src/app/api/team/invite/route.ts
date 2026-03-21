import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.teamId) {
      return Response.json({ error: "You are not in a team" }, { status: 400 });
    }

    const invites = await db.teamInvite.findMany({
      where: { teamId: user.teamId, status: "pending" },
      include: {
        sender: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: invites });
  } catch (error) {
    console.error("List invites error:", error);
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

    if (!user.teamId) {
      return Response.json({ error: "You are not in a team" }, { status: 400 });
    }

    if (!["owner", "admin"].includes(user.role)) {
      return Response.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Check if user is already a team member
    const existingMember = await db.user.findFirst({
      where: { email, teamId: user.teamId },
    });
    if (existingMember) {
      return Response.json(
        { error: "This user is already a member of the team" },
        { status: 400 }
      );
    }

    // Check for existing pending invite
    const existingInvite = await db.teamInvite.findFirst({
      where: { email, teamId: user.teamId, status: "pending" },
    });
    if (existingInvite) {
      return Response.json(
        { error: "An invite has already been sent to this email" },
        { status: 400 }
      );
    }

    const invite = await db.teamInvite.create({
      data: {
        teamId: user.teamId,
        email,
        role,
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${invite.token}`;

    // Try sending email via Mailgun
    let emailSent = false;
    try {
      const { sendEmail } = await import("@/lib/mailgun");
      const team = await db.team.findUnique({ where: { id: user.teamId } });
      await sendEmail(
        email,
        `You've been invited to join ${team?.name || "a team"} on GHL Lite`,
        `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Team Invitation</h2>
          <p>${user.name} has invited you to join <strong>${team?.name || "their team"}</strong> as a <strong>${role}</strong>.</p>
          <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #18181b; color: white; text-decoration: none; border-radius: 8px;">Accept Invitation</a></p>
          <p style="color: #71717a; font-size: 14px;">This invitation expires in 7 days.</p>
        </div>
        `
      );
      emailSent = true;
    } catch {
      // Mailgun not configured — that's fine, return the link
    }

    return Response.json(
      {
        data: {
          invite,
          inviteLink,
          emailSent,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invite error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
