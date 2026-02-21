/* eslint-disable react/no-unescaped-entities */
"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Clock, MapPin, Disc3, CheckCircle2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ReportsList } from "@/components/reports/ReportsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventApprovals, useApproveEvent, useRejectEvent } from "@/lib/hooks/use-approvals";
import { useEventAuditLogs } from "@/lib/hooks/use-audit-logs";
import { useAllReports } from "@/lib/hooks/use-reports";
import { useProfile } from "@/lib/hooks/use-profile";
import { useTransitionEventToCompleted, useEventVersions } from "@/lib/hooks/use-events";
import { UserRole } from "@/lib/types/roles";
import { EventCreatorCard } from "./EventCreatorCard";
import { ModificationRequestDialog } from "./ModificationRequestDialog";
import { CancellationDialog } from "./CancellationDialog";
import { useCanRequestCancellation } from "@/lib/hooks/use-cancellations";
import { ApprovalStatus, ApprovalType } from "@/lib/types/database.types";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { ModificationVersionsList } from "./ModificationVersionsList";
import { EventDetailVenueCard } from "./EventDetailVenueCard";
import { EventDetailDJCard } from "./EventDetailDJCard";
import { MarketingTab } from "./MarketingTab";

interface EventDetailClientProps {
  event: EventWithRelations;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  in_review: "bg-blue-500",
  rejected: "bg-red-500",
  approved_scheduled: "bg-green-500",
  completed_awaiting_report: "bg-yellow-500",
  completed_archived: "bg-slate-500",
  cancelled: "bg-orange-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  rejected: "Rejected",
  approved_scheduled: "Approved",
  completed_awaiting_report: "Awaiting Report",
  completed_archived: "Archived",
  cancelled: "Cancelled",
};

export function EventDetailClient({ event }: EventDetailClientProps) {
  const router = useRouter();
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpAction, setOtpAction] = useState<"approve" | "reject">("approve");
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const startDate = event.starts_at ? new Date(event.starts_at) : null;

  // Get current user profile to check role
  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;
  const isMarketingManager = profile?.role === UserRole.MARKETING_MANAGER;
  const isEventPlanner = profile?.role === UserRole.EVENT_PLANNER;
  const isEventCreator = event.creator_id === profile?.id;

  // Transition mutation
  const transitionMutation = useTransitionEventToCompleted();

  // Fetch approval chain for this event (only if not draft)
  const { data: approvals, isLoading: loadingApprovals } = useEventApprovals(
    event.status !== "draft" ? event.id : null
  );
  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();

  // Current user can only approve/reject when it is their turn (status = "pending"). No bypass for Global Director.
  const pendingApproval = approvals?.find(
    (a: EventApprovalWithApprover) => a.approver_id === profile?.id && a.status === "pending"
  ) as EventApprovalWithApprover | undefined;
  const pendingApprovalType = pendingApproval?.approval_type;
  const hasPendingApprovalForCurrentUser = !!pendingApproval;

  // While user is approving/rejecting (comment → OTP → request), disable actions and show skeleton on approval chain
  const isApprovalActionInProgress = approvalSubmitting || approveMutation.isPending || rejectMutation.isPending;

  // Note: hasPendingModification is now checked using versions (see below after versions are fetched)

  // Check for pending cancellations
  const hasPendingCancellation =
    approvals?.some(
      (a: { approval_type?: ApprovalType; status?: ApprovalStatus }) =>
        a.approval_type === "cancellation" && (a.status === "pending" || a.status === "waiting")
    ) || false;

  // Check if user can request cancellation (only for approved_scheduled events)
  const { data: canRequestCancellation } = useCanRequestCancellation(
    event.status === "approved_scheduled" ? event.id : null
  );

  // Fetch audit logs for this event (authorized users only)
  const { data: auditLogs, isLoading: loadingAuditLogs } = useEventAuditLogs(
    event.status !== "draft" ? event.id : null
  );

  // Fetch all reports for this event (if completed)
  const { data: allReports = [] } = useAllReports(
    event.status === "completed_awaiting_report" || event.status === "completed_archived" ? event.id : null
  );

  // Get approved report if exists, otherwise get most recent report for backward compatibility
  const approvedReport = allReports.find((r) => r.status === "approved");
  const pendingReport = allReports.find((r) => r.status === "pending");

  // Check if user can submit a new report (no approved report and no pending report exists)
  const canSubmitReport = isEventCreator && !approvedReport && !pendingReport;

  // Fetch event versions
  const { data: versions = [], isLoading: loadingVersions } = useEventVersions(event.id);
  const hasVersions = versions.length > 0;

  // Check for pending modifications - check if any version is in_review
  const hasPendingModification = versions.some((v) => v.status === "in_review");

  const handleTransition = async () => {
    try {
      await transitionMutation.mutateAsync(event.id);
      setShowTransitionDialog(false);
      router.refresh();
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleApproveContinueToOtp = () => {
    if (!approvalComment.trim()) return;
    setOtpAction("approve");
    setShowApproveDialog(false);
    setShowOtpDialog(true);
  };

  const handleRejectContinueToOtp = () => {
    if (!approvalComment.trim()) return;
    setOtpAction("reject");
    setShowRejectDialog(false);
    setShowOtpDialog(true);
  };

  const handleOtpVerified = async (verificationToken: string) => {
    setApprovalSubmitting(true);
    try {
      if (otpAction === "approve") {
        await approveMutation.mutateAsync({ eventId: event.id, comment: approvalComment, verificationToken });
      } else {
        await rejectMutation.mutateAsync({ eventId: event.id, comment: approvalComment, verificationToken });
      }
      setApprovalComment("");
      setShowOtpDialog(false);
      router.refresh();
    } catch (e) {
      console.error("Approval action failed:", e);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Marketing tab: only visible to global director and marketing manager
  const showMarketingTab =
    (event.status === "approved_scheduled" ||
      event.status === "completed_awaiting_report" ||
      event.status === "completed_archived") &&
    (isGlobalDirector || isMarketingManager);

  // Controlled tab so we can switch to Marketing once profile loads (profile is async)
  const [activeTab, setActiveTab] = useState("information");
  const hasAppliedMarketingDefault = useRef(false);

  useEffect(() => {
    // Only marketing manager gets Marketing as default tab; global director stays on Information
    if (showMarketingTab && isMarketingManager && !hasAppliedMarketingDefault.current) {
      setActiveTab("marketing");
      hasAppliedMarketingDefault.current = true;
    }
    if (!showMarketingTab && activeTab === "marketing") {
      setActiveTab("information");
    }
  }, [showMarketingTab, isMarketingManager, activeTab]);

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 mt-4">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">{event.title}</h1>
            <Badge
              variant="outline"
              className={`${statusColors[event.status] || "bg-gray-500"} text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1 shrink-0`}
            >
              {statusLabels[event.status] || event.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            {startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(startDate, "MMM d, yyyy")}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(startDate, "h:mm a")}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue.name}
              </span>
            )}
            {event.dj && (
              <span className="flex items-center gap-1">
                <Disc3 className="h-4 w-4" />
                {event.dj.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for Information, Modification Versions, Reports, and Marketing */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="information">Information</TabsTrigger>
          {hasVersions && <TabsTrigger value="modification-versions">Modification Versions</TabsTrigger>}
          {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
            <TabsTrigger value="reports">Reports</TabsTrigger>
          )}
          {showMarketingTab && <TabsTrigger value="marketing">Marketing</TabsTrigger>}
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Approval Progress (only for non-draft events) */}
              {event.status !== "draft" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Approval Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingApprovals || isApprovalActionInProgress ? (
                      <Skeleton className="h-32 w-full" />
                    ) : approvals && approvals.length > 0 ? (
                      <ApprovalChainTimeline
                        approvals={approvals}
                        showComments={false}
                        showTimestamps={true}
                        compact={true}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No approval chain found.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardContent className="space-y-4">
                  {/* Event creator (fetched profile: avatar, name, email, phone) */}
                  {event.creator_id && (
                    <div className="pb-4 border-b">
                      <EventCreatorCard creatorId={event.creator_id} />
                    </div>
                  )}

                  {(event.expected_attendance ||
                    event.minimum_ticket_price != null ||
                    event.minimum_table_price != null) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {event.expected_attendance && (
                        <div>
                          <p className="text-muted-foreground mb-1">Expected Attendees</p>
                          <p className="font-medium">{event.expected_attendance.toLocaleString()}</p>
                        </div>
                      )}
                      {event.minimum_ticket_price != null && (
                        <div>
                          <p className="text-muted-foreground mb-1">Min. ticket price</p>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(event.minimum_ticket_price))}
                          </p>
                        </div>
                      )}
                      {event.minimum_table_price != null && (
                        <div>
                          <p className="text-muted-foreground mb-1">Min. table price</p>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(Number(event.minimum_table_price))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div>
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{event.notes || "No notes for this event."}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Log History (only for non-draft events, authorized users only) */}
              {event.status !== "draft" && (
                <div id="logs">
                  <AuditTimeline logs={auditLogs || []} isLoading={loadingAuditLogs} collapsible />
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (SIDEBAR) */}
            <div className="space-y-6">
              {event.venue && <EventDetailVenueCard venue={event.venue} />}
              {event.dj && <EventDetailDJCard dj={event.dj} />}
            </div>
          </div>
        </TabsContent>

        {/* Modification Versions Tab */}
        {hasVersions && (
          <TabsContent value="modification-versions" className="space-y-6">
            <ModificationVersionsList
              versions={versions}
              isLoading={loadingVersions}
              eventId={event.id}
              onRequestModification={() => setShowModificationDialog(true)}
              canRequestModification={event.status === "approved_scheduled" && isEventPlanner && isEventCreator}
              hasPendingModification={hasPendingModification}
            />
          </TabsContent>
        )}

        {/* Reports Tab */}
        {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
          <TabsContent value="reports" className="space-y-6">
            <ReportsList
              reports={allReports}
              eventTitle={event.title}
              eventId={event.id}
              canSubmit={canSubmitReport}
              onOpenSubmitDialog={() => setShowReportDialog(true)}
            />
          </TabsContent>
        )}

        {/* Marketing Tab - only global director and marketing manager */}
        {showMarketingTab && (
          <TabsContent value="marketing" className="space-y-6">
            <MarketingTab eventId={event.id} event={event} />
          </TabsContent>
        )}
      </Tabs>

      {/* Page Actions - all action buttons at the end of the page */}
      {(hasPendingApprovalForCurrentUser ||
        (isGlobalDirector && event.status === "approved_scheduled") ||
        (event.status === "approved_scheduled" && isEventPlanner && isEventCreator)) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {/* Approve / Reject - when current user has pending approval */}
            {hasPendingApprovalForCurrentUser && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isApprovalActionInProgress}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={() => setShowApproveDialog(true)} disabled={isApprovalActionInProgress}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {/* Global Director: Mark as Completed */}
            {isGlobalDirector && event.status === "approved_scheduled" && (
              <Button
                variant="outline"
                onClick={() => setShowTransitionDialog(true)}
                disabled={transitionMutation.isPending || isApprovalActionInProgress}
              >
                {transitionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transitioning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </>
                )}
              </Button>
            )}
            {/* Event creator: Request Modification / Cancellation */}
            {event.status === "approved_scheduled" && isEventPlanner && isEventCreator && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowModificationDialog(true)}
                  disabled={hasPendingModification || isApprovalActionInProgress}
                >
                  {hasPendingModification ? "Modification Pending" : "Request Modification"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancellationDialog(true)}
                  disabled={!canRequestCancellation || hasPendingCancellation || isApprovalActionInProgress}
                >
                  {hasPendingCancellation ? "Cancellation Pending" : "Request Cancellation"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Dialog */}
      {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
        <ReportDialog open={showReportDialog} onOpenChange={setShowReportDialog} eventId={event.id} event={event} />
      )}

      {/* Transition Confirmation Dialog */}
      <AlertDialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Event as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will transition the event from "Approved - Scheduled" to "Completed - Awaiting Report". The event
              creator will be notified to submit a post-event report.
              <br />
              <br />
              <strong>Event:</strong> {event.title}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transitionMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransition}
              disabled={transitionMutation.isPending}
              className="bg-primary"
            >
              {transitionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transitioning...
                </>
              ) : (
                "Confirm Transition"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modification Request Dialog */}
      <ModificationRequestDialog open={showModificationDialog} onOpenChange={setShowModificationDialog} event={event} />

      {/* Cancellation Request Dialog */}
      {event.status === "approved_scheduled" && (
        <CancellationDialog
          open={showCancellationDialog}
          onOpenChange={(open) => {
            setShowCancellationDialog(open);
            if (!open) {
              router.refresh();
            }
          }}
          eventId={event.id}
          eventTitle={event.title}
        />
      )}

      {/* Approve Dialog (for pending approval on event detail) */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingApprovalType === "report"
                ? "Approve Report"
                : pendingApprovalType === "marketing_report"
                  ? "Approve Marketing Report"
                  : pendingApprovalType === "modification"
                    ? "Approve Modification"
                    : pendingApprovalType === "cancellation"
                      ? "Approve Cancellation"
                      : "Approve Event"}
            </DialogTitle>
            <DialogDescription>
              {isGlobalDirector ? (
                <>
                  As a <strong>Global Director</strong>, your approval may finalize this, bypassing any remaining
                  approvers. Please provide a comment. This will be recorded in the audit log.
                </>
              ) : (
                "Please provide a comment for your approval decision. This will be recorded in the audit log."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="detail-approve-comment">Comment *</Label>
              <Textarea
                id="detail-approve-comment"
                placeholder="Enter your approval comment..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setApprovalComment("");
              }}
              disabled={approvalSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleApproveContinueToOtp} disabled={!approvalComment.trim() || approvalSubmitting}>
              Continue to verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog (for pending approval on event detail) */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingApprovalType === "report"
                ? "Reject Report"
                : pendingApprovalType === "marketing_report"
                  ? "Reject Marketing Report"
                  : pendingApprovalType === "modification"
                    ? "Reject Modification"
                    : pendingApprovalType === "cancellation"
                      ? "Reject Cancellation"
                      : "Reject Event"}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be recorded in the audit log and the creator will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="detail-reject-comment">Reason for Rejection *</Label>
              <Textarea
                id="detail-reject-comment"
                placeholder="Enter your rejection reason..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setApprovalComment("");
              }}
              disabled={approvalSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectContinueToOtp}
              disabled={!approvalComment.trim() || approvalSubmitting}
            >
              Continue to verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpVerificationDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        onVerified={handleOtpVerified}
        contextType="event_approval"
        contextId={event.id}
        action={otpAction}
        title="Verify with OTP"
        description="We sent a 4-digit code to your email. Enter it below to confirm your decision."
      />
    </div>
  );
}
