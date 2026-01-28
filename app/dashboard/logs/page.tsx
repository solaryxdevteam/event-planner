import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { LogsClient } from "@/components/logs/LogsClient";
import { UserRole } from "@/lib/types/roles";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  // Layout already ensures auth, use requireAuth for type safety
  const user = await requireAuth(true); // Allow pending users (they'll be redirected by middleware)

  const role = user.dbUser.role as UserRole;

  // Only allow non-event-planner roles (curators and above)
  if (role === UserRole.EVENT_PLANNER) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          Review all important actions happening across events, venues, and users in your organization.
        </p>
      </div>

      <LogsClient />
    </div>
  );
}
