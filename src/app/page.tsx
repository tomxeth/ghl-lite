import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getSession();

  if (user) {
    redirect("/contacts");
  } else {
    redirect("/login");
  }
}
