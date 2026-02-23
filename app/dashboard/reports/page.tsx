/**
 * Reports Page
 *
 * Lists approved reports with filters (event, venue, user, DJ, date), sales chart by date, and table with pagination.
 * Only Global Directors can access this page.
 */

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { UserRole } from "@/lib/types/roles";
import { ReportsPageClient } from "@/components/reports/ReportsPageClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAuth(true);
  if (user.dbUser.role !== UserRole.GLOBAL_DIRECTOR) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-4 p-2 sm:px-2 sm:py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View approved post-event reports, filter by event, venue, user, or DJ, and see table, ticket, and bar sales by
          date.
        </p>
      </div>
      <ReportsPageClient />
    </div>
  );
}
