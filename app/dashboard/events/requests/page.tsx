"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function EventRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "drafts";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/dashboard/events/requests?${params.toString()}`);
  };

  // Fetch events by status
  const { data: drafts = [], isLoading: loadingDrafts } = useEvents({ status: "draft" });
  const { data: inReview = [], isLoading: loadingInReview } = useEvents({ status: "in_review" });
  const { data: rejected = [], isLoading: loadingRejected } = useEvents({ status: "rejected" });

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
        venue_id: selectedEvent.venue_id || null,
        expected_attendance: selectedEvent.expected_attendance || null,
        minimum_ticket_price: selectedEvent.minimum_ticket_price ?? null,
        minimum_table_price: selectedEvent.minimum_table_price ?? null,
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

      <Tabs value={defaultTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="drafts">Drafts {drafts.length > 0 && `(${drafts.length})`}</TabsTrigger>
          <TabsTrigger value="in-review">In Review {inReview.length > 0 && `(${inReview.length})`}</TabsTrigger>
          <TabsTrigger value="rejected">Rejected {rejected.length > 0 && `(${rejected.length})`}</TabsTrigger>
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
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : rejected.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No rejected events</p>
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
