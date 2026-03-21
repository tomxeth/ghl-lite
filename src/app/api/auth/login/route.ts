import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Rate limit: max 10 attempts per email per 15 minutes
    const allowed = await checkRateLimit(`login:${email}`, 15 * 60 * 1000, 10);
    if (!allowed) {
      return Response.json(
        { error: "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes." },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return Response.json(
        { error: "Email ou mot de passe invalide" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.hashedPassword);
    if (!valid) {
      return Response.json(
        { error: "Email ou mot de passe invalide" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    // Clean up expired sessions for this user
    db.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    }).catch(() => {});

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { error: "Une erreur inattendue s'est produite" },
      { status: 500 }
    );
  }
}
