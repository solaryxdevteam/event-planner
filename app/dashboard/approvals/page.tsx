"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  useApprovals,
  useApproveEvent,
  useRejectEvent,
  useVenueApprovals,
  useApproveVenue,
  useRejectVenue,
} from "@/lib/hooks/use-approvals";
import { useProfile } from "@/lib/hooks/use-profile";
import { PendingApprovalCard } from "@/components/approvals/PendingApprovalCard";
import { PendingVenueApprovalCard } from "@/components/approvals/PendingVenueApprovalCard";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, List, CheckCircle2, FileEdit, XCircle, FileText, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import type { VenueApprovalWithApprover } from "@/lib/data-access/venue-approvals.dal";

const tabCountBadgeClass =
  "bg-red-500 text-white rounded-full w-6.5 h-6 px-1 justify-center text-xs font-semibold border-0";

export default function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type") || "event";
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  // Local tab state so switching is instant; URL updates in background
  const [activeTab, setActiveTab] = useState(urlType);

  // Sync active tab when URL changes (e.g. initial load, back/forward)
  useEffect(() => {
    setActiveTab(urlType);
  }, [urlType]);

  // Get current user profile for role checking (e.g. PendingApprovalCard)
  const { data: profile } = useProfile();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/dashboard/approvals?${params.toString()}`);
  };

  // Fetch approvals by type
  const { data: eventApprovals = [], isLoading: loadingEvents } = useApprovals({
    approval_type: "event",
  });
  const { data: modificationApprovals = [], isLoading: loadingModifications } = useApprovals({
    approval_type: "modification",
  });
  const { data: cancellationApprovals = [], isLoading: loadingCancellations } = useApprovals({
    approval_type: "cancellation",
  });
  const { data: reportApprovals = [], isLoading: loadingReports } = useApprovals({
    approval_type: "report",
  });
  const { data: marketingReportApprovals = [], isLoading: loadingMarketingReports } = useApprovals({
    approval_type: "marketing_report",
  });
  const { data: venueApprovals = [], isLoading: loadingVenues } = useVenueApprovals();

  // Mutations
  const approveEventMutation = useApproveEvent();
  const rejectEventMutation = useRejectEvent();
  const approveVenueMutation = useApproveVenue();
  const rejectVenueMutation = useRejectVenue();

  const handleApprove = async (eventId: string, comment: string, verificationToken: string) => {
    await approveEventMutation.mutateAsync({ eventId, comment, verificationToken });
  };

  const handleReject = async (eventId: string, comment: string, verificationToken: string) => {
    await rejectEventMutation.mutateAsync({ eventId, comment, verificationToken });
  };

  const handleApproveVenue = async (venueId: string, comment: string, verificationToken: string) => {
    await approveVenueMutation.mutateAsync({ venueId, comment, verificationToken });
  };

  const handleRejectVenue = async (venueId: string, comment: string, verificationToken: string) => {
    await rejectVenueMutation.mutateAsync({ venueId, comment, verificationToken });
  };

  const renderApprovalList = (
    approvals: EventApprovalWithApprover[],
    isLoading: boolean,
    emptyState: { icon: React.ReactNode; title: string; description: string }
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      );
    }

    if (approvals.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-muted p-4 mb-4">{emptyState.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">{emptyState.description}</p>
          </CardContent>
        </Card>
      );
    }

    // Sort by event start date (earlier = more urgent)
    const sortedApprovals = [...approvals].sort((a, b) => {
      const aDate = a.event?.starts_at ? new Date(a.event.starts_at).getTime() : Infinity;
      const bDate = b.event?.starts_at ? new Date(b.event.starts_at).getTime() : Infinity;
      return aDate - bDate;
    });

    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedApprovals.map((approval) => (
            <PendingApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
              userRole={profile?.role}
              isVertical={true}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedApprovals.map((approval) => (
          <PendingApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={handleApprove}
            onReject={handleReject}
            userRole={profile?.role}
            isVertical={false}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="h-12 p-1.5 border border-input/50 gap-1 overflow-x-auto scrollbar-hide w-full sm:w-fit inline-flex rounded-xl bg-muted/60">
            <TabsTrigger
              value="event"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Events</span>
              {eventApprovals.length > 0 && <Badge className={tabCountBadgeClass}>{eventApprovals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="venues"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Venues</span>
              {venueApprovals.length > 0 && <Badge className={tabCountBadgeClass}>{venueApprovals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Reports</span>
              {reportApprovals.length > 0 && <Badge className={tabCountBadgeClass}>{reportApprovals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="marketing_report"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Marketing Reports</span>
              {marketingReportApprovals.length > 0 && (
                <Badge className={tabCountBadgeClass}>{marketingReportApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="modification"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Modifications</span>
              {modificationApprovals.length > 0 && (
                <Badge className={tabCountBadgeClass}>{modificationApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="cancellation"
              className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm "
            >
              <span>Cancellations</span>
              {cancellationApprovals.length > 0 && (
                <Badge className={tabCountBadgeClass}>{cancellationApprovals.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* View Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="event" className="space-y-4">
          {renderApprovalList(eventApprovals, loadingEvents, {
            icon: <CheckCircle2 className="h-8 w-8 text-muted-foreground" />,
            title: "All caught up!",
            description:
              "There are no pending event approvals at this time. New event requests will appear here for your review.",
          })}
        </TabsContent>

        <TabsContent value="modification" className="space-y-4">
          {renderApprovalList(modificationApprovals, loadingModifications, {
            icon: <FileEdit className="h-8 w-8 text-muted-foreground" />,
            title: "No modification requests",
            description:
              "There are no pending modification approvals. Event modification requests will appear here when submitted.",
          })}
        </TabsContent>

        <TabsContent value="cancellation" className="space-y-4">
          {renderApprovalList(cancellationApprovals, loadingCancellations, {
            icon: <XCircle className="h-8 w-8 text-muted-foreground" />,
            title: "No cancellation requests",
            description:
              "There are no pending cancellation approvals. Cancellation requests will appear here when submitted.",
          })}
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {renderApprovalList(reportApprovals, loadingReports, {
            icon: <FileText className="h-8 w-8 text-muted-foreground" />,
            title: "No report approvals",
            description:
              "There are no pending report approvals. Post-event reports will appear here when submitted for review.",
          })}
        </TabsContent>

        <TabsContent value="marketing_report" className="space-y-4">
          {renderApprovalList(marketingReportApprovals, loadingMarketingReports, {
            icon: <FileText className="h-8 w-8 text-muted-foreground" />,
            title: "No marketing report approvals",
            description:
              "There are no pending marketing report approvals. Marketing managers' reports will appear here when submitted.",
          })}
        </TabsContent>

        <TabsContent value="venues" className="space-y-4">
          {loadingVenues ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : venueApprovals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No pending venue approvals</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  New venue submissions from Event Planners (and others) will appear here. The approval chain follows
                  the same hierarchy as events (City Curator → Regional → Lead → Global Director).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {venueApprovals.map((approval: VenueApprovalWithApprover) => (
                <PendingVenueApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApproveVenue}
                  onReject={handleRejectVenue}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
