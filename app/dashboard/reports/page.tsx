/**
 * Reports Page
 *
 * Lists approved reports with filters, chart by date (net profit), and table with pagination.
 */

import { ReportsPageClient } from "@/components/reports/ReportsPageClient";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-4 p-2 sm:p-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View approved post-event reports, filter by event or venue, and see net profit by date.
        </p>
      </div>
      <ReportsPageClient />
    </div>
  );
}
