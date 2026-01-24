import { getServerUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getServerUser();

  // Redirect pending users to profile page
  if (user?.dbUser.status === "pending") {
    redirect("/dashboard/profile");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Event Planner dashboard</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Total Events</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">Active Venues</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <p className="text-center text-muted-foreground py-8">No recent activity to display</p>
      </div>
    </div>
  );
}
