import { getServerUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getServerUser();

  // Redirect pending users to profile page
  if (user?.dbUser.status === "pending") {
    redirect("/dashboard/profile");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Event Planner dashboard</p>
      </div>
      <DashboardClient />
    </div>
  );
}
