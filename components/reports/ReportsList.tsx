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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileText, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ReportViewDialog } from "./ReportViewDialog";
import type { Report } from "@/lib/types/database.types";
import { useProfile } from "@/lib/hooks/use-profile";
import { useApproveEvent, useRejectEvent, useEventApprovals } from "@/lib/hooks/use-approvals";
import { UserRole } from "@/lib/types/roles";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";

interface ReportsListProps {
  reports: Report[];
  eventTitle: string;
  eventId?: string;
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

export function ReportsList({ reports, eventTitle, eventId, canSubmit, onOpenSubmitDialog }: ReportsListProps) {
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState<Report | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState<Report | null>(null);
  const [comment, setComment] = useState("");

  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  // Fetch event approvals to check if user has pending approval for this report
  // Use the passed eventId or fall back to the first report's event_id
  const effectiveEventId = eventId || (reports.length > 0 ? reports[0].event_id : null);
  const { data: approvals } = useEventApprovals(effectiveEventId);

  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();

  // Check if the current user has a pending approval for this report
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasPendingApproval = (_reportEventId: string) => {
    if (!profile?.id || !approvals) return false;
    return approvals.some((a: { approval_type?: string; approver_id?: string; status?: string }) => {
      return (
        a.approval_type === "report" &&
        a.approver_id === profile.id &&
        (a.status === "pending" || (a.status === "waiting" && isGlobalDirector))
      );
    });
  };

  // Get approval/rejection comment for a report from Global Director
  const getReportDecision = (report: Report) => {
    if (!approvals || !report.event_id || (report.status !== "approved" && report.status !== "rejected")) {
      return null;
    }

    // Find approval/rejection from Global Director that matches the report's status
    // Since each report submission creates a new approval chain, find the one that was updated
    // after the report was created and matches the report status
    const reportCreatedAt = new Date(report.created_at).getTime();

    const matchingApprovals = approvals.filter((a: EventApprovalWithApprover) => {
      if (
        a.approval_type !== "report" ||
        a.event_id !== report.event_id ||
        a.approver?.role !== UserRole.GLOBAL_DIRECTOR ||
        a.status !== report.status ||
        !a.comment
      ) {
        return false;
      }

      // Only include approvals that were updated after the report was created
      // (or at least match the report's updated_at if it's been updated)
      const approvalUpdatedAt = new Date(a.updated_at || a.created_at).getTime();

      // Approval should be after report creation, and ideally close to report update time
      return approvalUpdatedAt >= reportCreatedAt;
    });

    // Get the most recent approval/rejection (by updated_at)
    const decision = matchingApprovals.sort(
      (a: EventApprovalWithApprover, b: EventApprovalWithApprover) =>
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )[0];

    return decision
      ? {
          comment: decision.comment,
          status: decision.status,
          approver: decision.approver?.name || "Global Director",
          updatedAt: decision.updated_at || decision.created_at,
        }
      : null;
  };

  const handleApprove = async (report: Report) => {
    if (!comment.trim() || !report.event_id) return;
    try {
      await approveMutation.mutateAsync({ eventId: report.event_id, comment });
      setShowApproveDialog(null);
      setComment("");
    } catch (error) {
      console.error("Error approving report:", error);
    }
  };

  const handleReject = async (report: Report) => {
    if (!comment.trim() || !report.event_id) return;
    try {
      await rejectMutation.mutateAsync({ eventId: report.event_id, comment });
      setShowRejectDialog(null);
      setComment("");
    } catch (error) {
      console.error("Error rejecting report:", error);
    }
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

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
          <>
            {/* Show message if there's a pending report */}
            {reports.some((r) => r.status === "pending") && !canSubmit && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  A report is currently pending approval. Please wait for the Global Director to approve or reject it
                  before submitting a new report.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const decision = getReportDecision(report);
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant="outline" className={`${statusColors[report.status]} text-white border-0`}>
                          {statusLabels[report.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{report.attendance_count.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                      <TableCell>
                        {decision ? (
                          <div className="space-y-1 max-w-xs">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  decision.status === "approved"
                                    ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/20"
                                    : "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/20"
                                }
                              >
                                {decision.status === "approved" ? "Approved" : "Rejected"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">by {decision.approver}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{decision.comment}</p>
                            {decision.updatedAt && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(decision.updatedAt), "MMM d, yyyy • h:mm a")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.status === "pending" && hasPendingApproval(report.event_id) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRejectDialog(report)}
                                disabled={isSubmitting}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setShowApproveDialog(report)}
                                disabled={isSubmitting}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setViewingReport(report)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {viewingReport && viewingReport.event_id && (
          <ReportViewDialog
            open={!!viewingReport}
            onOpenChange={(open) => !open && setViewingReport(null)}
            report={viewingReport}
            eventTitle={eventTitle}
            eventId={viewingReport.event_id as string}
            onApprove={() => setShowApproveDialog(viewingReport)}
            onReject={() => setShowRejectDialog(viewingReport)}
            canApproveReject={hasPendingApproval(viewingReport.event_id) && viewingReport.status === "pending"}
          />
        )}

        {/* Approve Dialog */}
        <Dialog open={!!showApproveDialog} onOpenChange={(open) => !open && setShowApproveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Report</DialogTitle>
              <DialogDescription>
                {isGlobalDirector ? (
                  <>
                    <span className="block mb-2">
                      As a <strong>Global Director</strong>, your approval will immediately finalize this report and
                      archive the event, bypassing any remaining approvers in the chain.
                    </span>
                    <span>
                      Please provide a comment for your approval decision. This will be recorded in the audit log.
                    </span>
                  </>
                ) : (
                  "Please provide a comment for your approval decision. This will be recorded in the audit log."
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approve-comment">Comment *</Label>
                <Textarea
                  id="approve-comment"
                  placeholder="Enter your approval comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveDialog(null);
                  setComment("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => showApproveDialog && handleApprove(showApproveDialog)}
                disabled={!comment.trim() || isSubmitting}
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={!!showRejectDialog} onOpenChange={(open) => !open && setShowRejectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Report</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection. This will be recorded in the audit log and the report creator
                will be notified. The creator can then edit and resubmit the report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reject-comment">Reason for Rejection *</Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Enter your rejection reason..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(null);
                  setComment("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showRejectDialog && handleReject(showRejectDialog)}
                disabled={!comment.trim() || isSubmitting}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
