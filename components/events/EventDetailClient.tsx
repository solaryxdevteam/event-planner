/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Calendar, Clock, MapPin, Building2, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ReportsList } from "@/components/reports/ReportsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventApprovals } from "@/lib/hooks/use-approvals";
import { useEventAuditLogs } from "@/lib/hooks/use-audit-logs";
import { useReport } from "@/lib/hooks/use-reports";
import { useProfile } from "@/lib/hooks/use-profile";
import { useTransitionEventToCompleted } from "@/lib/hooks/use-events";
import { UserRole } from "@/lib/types/roles";
import { VenueMapDisplay } from "./VenueMapDisplay";
import { ModificationRequestDialog } from "./ModificationRequestDialog";
import { CancellationDialog } from "./CancellationDialog";
import { useCanRequestCancellation } from "@/lib/hooks/use-cancellations";

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
  const startDate = event.starts_at ? new Date(event.starts_at) : null;
  const endDate = event.ends_at ? new Date(event.ends_at) : null;

  // Get current user profile to check role
  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;
  const isEventPlanner = profile?.role === UserRole.EVENT_PLANNER;
  const isEventCreator = event.creator_id === profile?.id;

  // Transition mutation
  const transitionMutation = useTransitionEventToCompleted();

  // Fetch approval chain for this event (only if not draft)
  const { data: approvals, isLoading: loadingApprovals } = useEventApprovals(
    event.status !== "draft" ? event.id : null
  );

  // Check for pending modifications
  const hasPendingModification =
    approvals?.some((a) => a.approval_type === "modification" && (a.status === "pending" || a.status === "waiting")) ||
    false;

  // Check for pending cancellations
  const hasPendingCancellation =
    approvals?.some((a) => a.approval_type === "cancellation" && (a.status === "pending" || a.status === "waiting")) ||
    false;

  // Check if user can request cancellation (only for approved_scheduled events)
  const { data: canRequestCancellation } = useCanRequestCancellation(
    event.status === "approved_scheduled" ? event.id : null
  );

  // Fetch audit logs for this event (authorized users only)
  const { data: auditLogs, isLoading: loadingAuditLogs } = useEventAuditLogs(
    event.status !== "draft" ? event.id : null
  );

  // Fetch report for this event (if completed)
  const { data: report } = useReport(
    event.status === "completed_awaiting_report" || event.status === "completed_archived" ? event.id : null
  );

  const handleTransition = async () => {
    try {
      await transitionMutation.mutateAsync(event.id);
      setShowTransitionDialog(false);
      // Refresh the page to show updated status
      router.refresh();
    } catch {
      // Error is handled by the mutation
    }
  };

  // Build venue address for map
  const venueAddress = event.venue
    ? [event.venue.address, event.venue.city, event.venue.country].filter(Boolean).join(", ")
    : null;

  // Build map URL - use coordinates if available, otherwise use address
  const mapUrl = event.venue
    ? event.venue.location_lat && event.venue.location_lng
      ? `https://www.google.com/maps?q=${event.venue.location_lat},${event.venue.location_lng}`
      : venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
        : null
    : null;

  // Get first venue image
  const venueImage = event.venue?.images && event.venue.images.length > 0 ? event.venue.images[0] : null;

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
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
                {endDate && startDate.toDateString() !== endDate.toDateString() && (
                  <> - {format(endDate, "MMM d, yyyy")}</>
                )}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(startDate, "h:mm a")}
                {endDate && ` - ${format(endDate, "h:mm a")}`}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for Information and Reports */}
      <Tabs defaultValue="information" className="space-y-6">
        <TabsList>
          <TabsTrigger value="information">Information</TabsTrigger>
          {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
            <TabsTrigger value="reports">Reports</TabsTrigger>
          )}
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
                    {loadingApprovals ? (
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

              {/* Venue / Location Card - Moved above Description */}
              {event.venue && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Venue Image */}
                    {venueImage && (
                      <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={venueImage}
                          alt={event.venue.name || "Venue image"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">{event.venue.name}</p>
                      {event.venue.address && <p className="text-muted-foreground">{event.venue.address}</p>}
                      {(event.venue.city || event.venue.country) && (
                        <p className="text-muted-foreground">
                          {[event.venue.city, event.venue.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Map with coordinates */}
                    {event.venue.location_lat && event.venue.location_lng ? (
                      <VenueMapDisplay
                        lat={event.venue.location_lat}
                        lng={event.venue.location_lng}
                        venueName={event.venue.name || undefined}
                      />
                    ) : mapUrl ? (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                          <MapPin className="mr-2 h-4 w-4" />
                          View on Map
                        </a>
                      </Button>
                    ) : null}

                    <Button asChild variant="outline" size="sm" className="w-full" disabled={!event.venue.short_id}>
                      {event.venue.short_id ? (
                        <Link href={`/dashboard/venues/${event.venue.short_id}/edit`}>View Venue Details</Link>
                      ) : (
                        <span>View Venue Details</span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description || "No description provided for this event."}
                  </p>
                  {(event.expected_attendance || event.budget_amount) && (
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {event.expected_attendance && (
                          <div>
                            <p className="text-muted-foreground mb-1">Expected Attendees</p>
                            <p className="font-medium">{event.expected_attendance.toLocaleString()}</p>
                          </div>
                        )}
                        {event.budget_amount && (
                          <div>
                            <p className="text-muted-foreground mb-1">Budget</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: event.budget_currency || "USD",
                              }).format(Number(event.budget_amount))}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audit Log History (only for non-draft events, authorized users only) */}
              {event.status !== "draft" && (
                <div id="logs">
                  <AuditTimeline logs={auditLogs || []} isLoading={loadingAuditLogs} />
                </div>
              )}

              {/* Notes */}
              {event.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN (SIDEBAR) */}
            <div className="space-y-6">
              {/* Admin Actions - Global Director Only */}
              {isGlobalDirector && event.status === "approved_scheduled" && (
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Admin Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowTransitionDialog(true)}
                      disabled={transitionMutation.isPending}
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
                    <p className="text-xs text-muted-foreground">
                      Manually transition this event to "Awaiting Report" status.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions - Only for Event Planner who created the event */}
              {event.status === "approved_scheduled" && isEventPlanner && isEventCreator && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowModificationDialog(true)}
                      disabled={hasPendingModification}
                    >
                      {hasPendingModification ? "Modification Pending" : "Request Modification"}
                    </Button>
                    {hasPendingModification && (
                      <p className="text-xs text-muted-foreground">
                        A modification request is already pending approval.
                      </p>
                    )}
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => setShowCancellationDialog(true)}
                      disabled={!canRequestCancellation || hasPendingCancellation}
                    >
                      {hasPendingCancellation ? "Cancellation Pending" : "Request Cancellation"}
                    </Button>
                    {hasPendingCancellation && (
                      <p className="text-xs text-muted-foreground">
                        A cancellation request is already pending approval.
                      </p>
                    )}
                    {!canRequestCancellation && !hasPendingCancellation && (
                      <p className="text-xs text-muted-foreground">
                        You don't have permission to request cancellation for this event.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
          <TabsContent value="reports" className="space-y-6">
            <ReportsList
              reports={report ? [report] : []}
              eventTitle={event.title}
              canSubmit={isEventCreator && (!report || report.status === "rejected")}
              onOpenSubmitDialog={() => setShowReportDialog(true)}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Report Dialog */}
      {(event.status === "completed_awaiting_report" || event.status === "completed_archived") && (
        <ReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          eventId={event.id}
          event={event}
          existingReport={report?.status === "rejected" ? report : null}
        />
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
    </div>
  );
}
