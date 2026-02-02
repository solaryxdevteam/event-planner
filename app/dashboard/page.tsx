import { requireAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Layout already ensures auth, but we need to check status
  // Use requireAuth(true) to allow pending users (they'll be redirected below)
  const user = await requireAuth(true);

  // Redirect pending users to profile page
  if (user.dbUser.status === "pending") {
    redirect("/dashboard/profile");
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Event Planner dashboard</p>
      </div>
      <DashboardClient />
    </div>
  );
}
