import { db } from "./db";

export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxAttempts: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  // Clean old entries (non-blocking)
  db.rateLimitEntry.deleteMany({
    where: { createdAt: { lt: windowStart } },
  }).catch(() => {});

  const count = await db.rateLimitEntry.count({
    where: {
      key,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= maxAttempts) {
    return false; // Rate limited
  }

  await db.rateLimitEntry.create({
    data: { key },
  });

  return true; // Allowed
}
