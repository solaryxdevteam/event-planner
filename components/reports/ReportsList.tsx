/**
 * Reports List Component
 *
 * Displays list of reports for an event
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { ReportViewDialog } from "./ReportViewDialog";
import type { Report } from "@/lib/types/database.types";

interface ReportsListProps {
  reports: Report[];
  eventTitle: string;
  canSubmit: boolean;
  onOpenSubmitDialog: () => void;
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

export function ReportsList({ reports, eventTitle, canSubmit, onOpenSubmitDialog }: ReportsListProps) {
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reports</CardTitle>
          {canSubmit && (
            <Button onClick={onOpenSubmitDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Submit Report
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No reports submitted yet.</p>
            {canSubmit && (
              <Button onClick={onOpenSubmitDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Submit First Report
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>{report.attendance_count.toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                  <TableCell>
                    {report.updated_at !== report.created_at ? format(new Date(report.updated_at), "PPp") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewingReport(report)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {viewingReport && (
          <ReportViewDialog
            open={!!viewingReport}
            onOpenChange={(open) => !open && setViewingReport(null)}
            report={viewingReport}
            eventTitle={eventTitle}
          />
        )}
      </CardContent>
    </Card>
  );
}
