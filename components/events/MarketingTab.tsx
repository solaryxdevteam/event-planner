"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { MarketingReportWithSubmitter } from "@/lib/types/database.types";
import { useMarketingReports } from "@/lib/hooks/use-marketing-reports";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { AddMarketingReportDialog } from "./AddMarketingReportDialog";

interface MarketingTabProps {
  eventId: string;
  event: EventWithRelations;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function MarketingTab({ eventId, event }: MarketingTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewReport, setViewReport] = useState<MarketingReportWithSubmitter | null>(null);

  const { data: profile } = useProfile();
  const { data: reports = [], isLoading } = useMarketingReports(eventId);

  const isMarketingManager = profile?.role === UserRole.MARKETING_MANAGER;
  const approvedReport = reports.find((r) => r.status === "approved");
  const pendingReport = reports.find((r) => r.status === "pending");
  const canAddReport = isMarketingManager && !approvedReport && !pendingReport;

  return (
    <div className="space-y-6">
      {/* Single Marketing card: Reports + Marketing Assets (report form marketing) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Marketing</CardTitle>
            {canAddReport && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Report
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Marketing Reports */}
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Reports</h3>
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">View more</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : reports.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No marketing reports yet.</p>
                {canAddReport && (
                  <Button onClick={() => setShowAddDialog(true)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Report
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">View more</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant="outline" className={`${statusColors[report.status]} text-white border-0`}>
                          {statusLabels[report.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{report.submitted_by_name ?? "—"}</TableCell>
                      <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{report.notes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setViewReport(report)} className="gap-1">
                          <Eye className="h-4 w-4" />
                          View more
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <AddMarketingReportDialog
        open={showAddDialog || !!viewReport}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setViewReport(null);
          }
        }}
        eventId={eventId}
        event={{
          marketing_flyers: event.marketing_flyers ?? null,
          marketing_videos: event.marketing_videos ?? null,
          marketing_budget: event.marketing_budget ?? null,
        }}
        viewReport={viewReport}
      />
    </div>
  );
}
