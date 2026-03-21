import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const registerSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        hashedPassword,
        name,
      },
    });

    // Create a default pipeline with standard stages
    const stageColors = [
      "#6B7280", // New Lead - gray
      "#3B82F6", // Contacted - blue
      "#8B5CF6", // Qualified - purple
      "#F59E0B", // Proposal - amber
      "#F97316", // Negotiation - orange
      "#22C55E", // Won - green
      "#EF4444", // Lost - red
    ];

    await db.pipeline.create({
      data: {
        userId: user.id,
        name: "Sales Pipeline",
        stages: {
          create: [
            "New Lead",
            "Contacted",
            "Qualified",
            "Proposal",
            "Negotiation",
            "Won",
            "Lost",
          ].map((name, index) => ({
            name,
            position: index,
            color: stageColors[index],
          })),
        },
      },
    });

    await createSession(user.id);

    return Response.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "An unexpected error occurred", details: message },
      { status: 500 }
    );
  }
}
