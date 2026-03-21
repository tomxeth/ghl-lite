import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { AuthProvider } from "@/components/layout/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const serializedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <AuthProvider user={serializedUser}>
      <div className="min-h-screen bg-zinc-50">
        <Sidebar />
        <div className="lg:pl-60">
          <Topbar />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
