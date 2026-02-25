"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventList } from "@/components/events/EventList";
import { useEvents, useDeleteEventDraft, useSubmitEventForApproval, useCreateEventDraft } from "@/lib/hooks/use-events";
import { Plus } from "lucide-react";
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
import type { EventWithRelations } from "@/lib/data-access/events.dal";

const tabCountBadgeClass =
  "bg-red-500 text-white rounded-full w-6.5 h-6 px-1 justify-center text-xs font-semibold border-0";

export default function EventRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "drafts";
  // Local tab state so switching is instant; URL updates in background
  const [selectedTab, setSelectedTab] = useState(tabFromUrl);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);

  // Sync selected tab from URL (e.g. back/forward, bookmark)
  useEffect(() => {
    setSelectedTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setSelectedTab(value); // Switch tab immediately, don't wait for URL/navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/dashboard/events/requests?${params.toString()}`); // Update URL in background
  };

  // Fetch events by status
  const { data: draftsData, isLoading: loadingDrafts } = useEvents({ status: "draft" });
  const { data: inReviewData, isLoading: loadingInReview } = useEvents({ status: "in_review" });
  const { data: rejectedData, isLoading: loadingRejected } = useEvents({ status: "rejected" });
  const drafts = draftsData?.events ?? [];
  const inReview = inReviewData?.events ?? [];
  const rejected = rejectedData?.events ?? [];

  // Mutations
  const deleteEventMutation = useDeleteEventDraft();
  const submitEventMutation = useSubmitEventForApproval();
  const createEventMutation = useCreateEventDraft();

  const handleView = (eventShortId: string) => {
    router.push(`/dashboard/events/${eventShortId}`);
  };

  const handleDeleteClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedEventId) {
      await deleteEventMutation.mutateAsync(selectedEventId);
      setDeleteDialogOpen(false);
      setSelectedEventId(null);
    }
  };

  const handleSubmitClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setSubmitDialogOpen(true);
  };

  const handleSubmitConfirm = async () => {
    if (selectedEventId) {
      await submitEventMutation.mutateAsync(selectedEventId);
      setSubmitDialogOpen(false);
      setSelectedEventId(null);
    }
  };

  const handleCopyFromRejected = (event: EventWithRelations) => {
    setSelectedEvent(event);
    setCopyDialogOpen(true);
  };

  const handleCopyConfirm = async () => {
    if (!selectedEvent) return;

    try {
      // Create a new draft based on the rejected event
      await createEventMutation.mutateAsync({
        title: `${selectedEvent.title} (Copy)`,
        starts_at: selectedEvent.starts_at || null,
        ends_at: selectedEvent.ends_at || null,
        venue_id: selectedEvent.venue_id || null,
        dj_id: selectedEvent.dj_id || null,
        expected_attendance: selectedEvent.expected_attendance || null,
        minimum_ticket_price: selectedEvent.minimum_ticket_price ?? null,
        minimum_table_price: selectedEvent.minimum_table_price ?? null,
        proposed_ticket_files: selectedEvent.proposed_ticket_files ?? [],
        proposed_table_files: selectedEvent.proposed_table_files ?? [],
        notes: selectedEvent.notes || null,
      });

      // Redirect to edit the new draft
      router.push(`/dashboard/events/requests/new`);
      setCopyDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error copying rejected event:", error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Event Requests</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
            Manage your event drafts and submissions
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/events/requests/new")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Event Request
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-12 p-1.5 border border-input/50 gap-1 overflow-x-auto scrollbar-hide w-full sm:w-fit inline-flex rounded-xl bg-muted/60">
          <TabsTrigger
            value="drafts"
            className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
          >
            <span>Drafts</span>
            {drafts.length > 0 && <Badge className={tabCountBadgeClass}>{drafts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="in-review"
            className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
          >
            <span>In Review</span>
            {inReview.length > 0 && <Badge className={tabCountBadgeClass}>{inReview.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
          >
            <span>Rejected</span>
            {rejected.length > 0 && <Badge className={tabCountBadgeClass}>{rejected.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-4">
          {loadingDrafts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <EventList
              events={drafts}
              onView={handleView}
              onDelete={handleDeleteClick}
              onSubmit={handleSubmitClick}
              emptyMessage="No draft events. Create your first event!"
            />
          )}
        </TabsContent>

        <TabsContent value="in-review" className="space-y-4">
          {loadingInReview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <EventList events={inReview} onView={handleView} showActions={false} emptyMessage="No events in review" />
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {loadingRejected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <EventList
              events={rejected}
              onView={handleView}
              onCreateFromRejected={handleCopyFromRejected}
              showActions={false}
              emptyMessage="No rejected events"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this event for approval? Once submitted, you won&apos;t be able to edit it
              until it&apos;s approved or rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitConfirm}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy from Rejected Dialog */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Event from Rejected</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEvent ? (
                <>
                  This will create a new draft based on <strong>&quot;{selectedEvent.title}&quot;</strong>. You can then
                  edit and resubmit it for approval.
                </>
              ) : (
                "This will create a new draft event based on the rejected event. You can then edit and resubmit it for approval."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyConfirm}>Create New Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
