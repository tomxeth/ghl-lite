import { getSession } from "@/lib/auth";
import { createInboundRoute } from "@/lib/mailgun";

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const webhookUrl = "https://crm.laformuleretour.com/api/email/inbound";
    const result = await createInboundRoute(webhookUrl);

    return Response.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("Setup inbound route error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Échec de la configuration de la route", details: message },
      { status: 500 }
    );
  }
}
