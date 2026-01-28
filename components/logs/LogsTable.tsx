"use client";

import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, FileText, User } from "lucide-react";
import type { AuditLogWithUser } from "@/lib/data-access/audit-logs.dal";

interface LogsTableProps {
  logs: AuditLogWithUser[];
  isLoading?: boolean;
  page: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

const actionLabels: Record<string, string> = {
  create_draft: "Create Draft",
  delete_draft: "Delete Draft",
  submit_for_approval: "Submit for Approval",
  approve: "Approve",
  reject: "Reject",
  request_modification: "Request Modification",
  approve_modification: "Approve Modification",
  reject_modification: "Reject Modification",
  request_cancellation: "Request Cancellation",
  approve_cancellation: "Approve Cancellation",
  reject_cancellation: "Reject Cancellation",
  submit_report: "Submit Report",
  approve_report: "Approve Report",
  reject_report: "Reject Report",
  update_event: "Update Event",
  create_user: "Create User",
  update_user: "Update User",
  deactivate_user: "Deactivate User",
  create_venue: "Create Venue",
  update_venue: "Update Venue",
  delete_venue: "Delete Venue",
  ban_venue: "Ban Venue",
};

const actionColors: Record<string, string> = {
  create_draft: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  delete_draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  submit_for_approval: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  approve: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reject: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  request_modification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approve_modification: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reject_modification: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  request_cancellation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  approve_cancellation: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reject_cancellation: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  submit_report: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  approve_report: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  reject_report: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  update_event: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  create_user: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  update_user: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  deactivate_user: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  create_venue: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  update_venue: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  delete_venue: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
  ban_venue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function LogsTable({ logs, isLoading, page, limit, hasMore, onPageChange }: LogsTableProps) {
  const isFirstPage = page <= 1;
  const totalPages = hasMore ? page + 1 : page;

  const startIndex = logs.length === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = (page - 1) * limit + logs.length;

  const skeletonRows = Array.from({ length: limit }, (_, i) => (
    <TableRow key={`skeleton-${i}`}>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-56" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
    </TableRow>
  ));

  const showEmptyState = !isLoading && logs.length === 0;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Action</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows
            ) : showEmptyState ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                    <Clock className="mb-1 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No activity found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters or date range to see more events happening in the system.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const label = actionLabels[log.action_type] || log.action_type;
                const badgeClass = actionColors[log.action_type] || "bg-slate-100 text-slate-800";

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge className={badgeClass} variant="outline">
                            {label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          {log.action_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{format(new Date(log.created_at), "PPp")}</span>
                        <span className="text-xs text-muted-foreground">
                          ID: <span className="font-mono text-[11px]">{log.id}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">
                            {log.user.name}{" "}
                            <span className="text-xs font-normal text-muted-foreground">({log.user.role})</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{log.user.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>System</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {log.event_id ? (
                          <span className="text-xs text-muted-foreground">
                            Event ID: <span className="font-mono text-[11px]">{log.event_id}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No event linked</span>
                        )}
                        {log.metadata &&
                          typeof (log.metadata as Record<string, unknown>).event_title !== "undefined" && (
                            <span className="mt-1 truncate text-xs">
                              <span className="text-muted-foreground">Event:</span>{" "}
                              {String((log.metadata as Record<string, unknown>).event_title)}
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {log.comment ? (
                          <p className="line-clamp-2 text-muted-foreground">{log.comment}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground">No additional comments</span>
                        )}
                        {log.metadata && Object.keys(log.metadata as Record<string, unknown>).length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>Metadata attached</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        {/* Results summary */}
        <div className="text-sm text-muted-foreground">
          {logs.length > 0 ? (
            <>
              Showing {startIndex} to {endIndex}
            </>
          ) : (
            "No results to show"
          )}
        </div>

        {/* Pagination controls */}
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
              <span className="hidden sm:inline sm:ml-1">Previous</span>
            </Button>

            {/* Page numbers with ellipsis – similar to UserTable */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const showPage = p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1);

                if (!showPage) {
                  const prevPage = p - 1;
                  const nextPage = p + 1;
                  if ((prevPage === 1 || prevPage === page - 2) && (nextPage === totalPages || nextPage === page + 2)) {
                    return (
                      <span key={p} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(p)}
                    className="min-w-[2.5rem]"
                    disabled={isLoading}
                    aria-label={`Go to page ${p}`}
                    aria-current={page === p ? "page" : undefined}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore || isLoading}
              aria-label="Next page"
            >
              <span className="hidden sm:inline sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
