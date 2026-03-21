import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères"),
  name: z.string().min(1, "Le nom est requis"),
});

export async function POST(request: Request) {
  try {
    // Rate limit: max 5 registrations per IP per hour
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const allowed = await checkRateLimit(`register:${ip}`, 60 * 60 * 1000, 5);
    if (!allowed) {
      return Response.json(
        { error: "Trop de tentatives d'inscription. Veuillez réessayer plus tard." },
        { status: 429 }
      );
    }

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
        { error: "Un utilisateur avec cet email existe déjà" },
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
        name: "Pipeline de vente",
        stages: {
          create: [
            "Nouveau lead",
            "Contacté",
            "Qualifié",
            "Proposition",
            "Négociation",
            "Gagné",
            "Perdu",
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
    return Response.json(
      { error: "Une erreur inattendue s'est produite" },
      { status: 500 }
    );
  }
}
