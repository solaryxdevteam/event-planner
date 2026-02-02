"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { ReportViewDialog } from "./ReportViewDialog";
import type { ApprovedReportRow } from "@/lib/data-access/reports.dal";

interface ReportsTableProps {
  reports: ApprovedReportRow[];
  isLoading: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

export function ReportsTable({
  reports,
  isLoading,
  page,
  limit,
  total,
  totalPages,
  hasMore,
  onPageChange,
}: ReportsTableProps) {
  const [viewingReport, setViewingReport] = useState<ApprovedReportRow | null>(null);
  const isFirstPage = page <= 1;
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = (page - 1) * limit + reports.length;
  const showEmptyState = !isLoading && reports.length === 0;

  const skeletonRows = Array.from({ length: limit }, (_, i) => (
    <TableRow key={`skeleton-${i}`}>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
    </TableRow>
  ));

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event name</TableHead>
              <TableHead>Venue name</TableHead>
              <TableHead>Attendance count</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows
            ) : showEmptyState ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No reports found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting filters or date range.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/dashboard/events/${row.event_short_id}`}>
                      <Badge variant="secondary" className="font-medium text-primary hover:bg-primary/20">
                        {row.event_title || "—"}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.venue_id && row.venue_name ? (
                      <Link href={`/dashboard/venues/${row.venue_short_id}/edit`}>
                        <Badge variant="secondary" className="font-medium text-primary hover:bg-primary/20">
                          {row.venue_name}
                        </Badge>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{row.attendance_count.toLocaleString()}</TableCell>
                  <TableCell>
                    {row.net_profit != null
                      ? Number(row.net_profit).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>{format(new Date(row.created_at), "PPp")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewingReport(row)} aria-label="View report">
                      <Eye className="mr-2 h-4 w-4" />
                      View more
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!showEmptyState && (
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div>
            {total > 0 ? (
              <>
                Showing {startIndex} to {endIndex} of {total}
              </>
            ) : (
              "No results to show"
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={isFirstPage || isLoading}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:ml-1 sm:inline">Previous</span>
              </Button>
              <span className="text-xs">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasMore || isLoading}
                aria-label="Next page"
              >
                <span className="hidden sm:mr-1 sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {viewingReport && (
        <ReportViewDialog
          open={!!viewingReport}
          onOpenChange={(open) => !open && setViewingReport(null)}
          report={viewingReport}
          eventTitle={viewingReport.event_title}
        />
      )}
    </>
  );
}
