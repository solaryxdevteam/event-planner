"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePickerNew } from "@/components/ui/date-time-picker-new";
import { createEventSchema, type CreateEventInput } from "@/lib/validation/events.schema";
import {
  useCreateEventDraft,
  useUpdateEventDraft,
  useSubmitEventForApproval,
  useFirstDraft,
  useDeleteEventDraft,
} from "@/lib/hooks/use-events";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPinIcon,
  Disc3,
  UsersIcon,
  CheckCircle2,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { VenueSelectionDialog } from "@/components/events/VenueSelectionDialog";
import { DJSelectionDialog } from "@/components/events/DJSelectionDialog";
import type { DJ } from "@/lib/types/database.types";

/** Minimal DJ shape for event form display (from event relation or full DJ) */
type DJDisplay = Pick<DJ, "id" | "name" | "picture_url" | "music_style" | "price" | "email">;
import { DraftDialog } from "@/components/events/DraftDialog";
import { EventProposedFileUpload } from "@/components/events/EventProposedFileUpload";
import { VenueCard } from "@/components/venues/VenueCard";
import { PriceInput } from "@/components/ui/price-input";
import { useVenue } from "@/lib/hooks/use-venues";
import { useDj } from "@/lib/hooks/use-djs";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import Image from "next/image";

type EventFormData = CreateEventInput;

interface EventFormProps {
  eventId?: string | null;
  shortId?: string | null;
}

// Venue selection display component
function VenueSelectionDisplay({
  selectedVenue,
  onSelect,
  error,
  maxAttendance,
  currentAttendance,
}: {
  selectedVenue: VenueWithCreator | null;
  onSelect: () => void;
  error?: string;
  maxAttendance?: number;
  currentAttendance?: number | null;
}) {
  // maxAttendance and currentAttendance are part of the interface but not currently used
  void maxAttendance;
  void currentAttendance;
  if (selectedVenue) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg overflow-hidden bg-card">
          <VenueCard venue={selectedVenue} onDelete={() => {}} userRole="EVENT_PLANNER" compact={true} />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={onSelect}>
          Change Venue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal h-auto py-12 border-2 border-dashed",
          error ? "border-destructive" : "hover:border-primary"
        )}
        onClick={onSelect}
      >
        <div className="flex flex-col items-center justify-center gap-3 w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <MapPinIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Select a venue</p>
            <p className="text-sm text-muted-foreground">Choose a venue for your event</p>
          </div>
        </div>
      </Button>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export function EventForm({ eventId, shortId }: EventFormProps) {
  const router = useRouter();
  const [startsAtDate, setStartsAtDate] = useState<Date | undefined>();
  const [endsAtDate, setEndsAtDate] = useState<Date | undefined>();
  const [existingDraft, setExistingDraft] = useState<EventWithRelations | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(eventId || null);
  const [draftShortId, setDraftShortId] = useState<string | null>(shortId || null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [showDjDialog, setShowDjDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithCreator | null>(null);
  const [selectedDj, setSelectedDj] = useState<DJDisplay | null>(null);
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [pendingEventData, setPendingEventData] = useState<CreateEventInput | null>(null);
  const dialogShownRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  const { data: profile } = useProfile();
  const createEventMutation = useCreateEventDraft();
  const updateEventMutation = useUpdateEventDraft();
  const submitEventMutation = useSubmitEventForApproval();
  const deleteEventMutation = useDeleteEventDraft();

  // Fetch first draft on mount
  const { data: firstDraft, isLoading: isLoadingDraftQuery } = useFirstDraft();

  const form = useForm<EventFormData>({
    resolver: zodResolver(createEventSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      starts_at: null,
      ends_at: null,
      venue_id: null,
      dj_id: null,
      expected_attendance: null,
      minimum_ticket_price: null,
      minimum_table_price: null,
      notes: null,
      proposed_ticket_files: [],
      proposed_table_files: [],
    },
  });

  // Fetch full venue if venue_id exists
  const venueId = form.watch("venue_id");
  const { data: fullVenue } = useVenue(venueId || null);

  // Fetch full DJ if dj_id exists
  const djId = form.watch("dj_id");
  const { data: fullDj } = useDj(djId || null);

  // Update selected venue when full venue is loaded
  useEffect(() => {
    if (fullVenue) {
      setSelectedVenue(fullVenue);
    }
  }, [fullVenue]);

  // Update selected DJ when full DJ is loaded
  useEffect(() => {
    if (fullDj) {
      setSelectedDj(fullDj);
    }
  }, [fullDj]);

  // Check for existing draft on mount - only show dialog once on initial load
  useEffect(() => {
    // Only check once when draft query finishes loading
    if (isLoadingDraftQuery || dialogShownRef.current) {
      return;
    }

    if (firstDraft) {
      setExistingDraft(firstDraft);
      setDraftId(firstDraft.id);
      setDraftShortId(firstDraft.short_id);
      setShowDraftDialog(true);
      dialogShownRef.current = true;
    } else {
      // No draft exists, user can start fresh
      setHasUserStarted(true);
    }
    setIsLoadingDraft(false);
  }, [firstDraft, isLoadingDraftQuery]);

  // Load existing draft into form
  const loadDraft = useCallback(
    (draft: EventWithRelations) => {
      form.reset({
        title: draft.title,
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
        venue_id: draft.venue_id || null,
        dj_id: draft.dj_id ?? null,
        expected_attendance: draft.expected_attendance || null,
        minimum_ticket_price: draft.minimum_ticket_price ?? null,
        minimum_table_price: draft.minimum_table_price ?? null,
        notes: draft.notes || null,
        proposed_ticket_files: Array.isArray(draft.proposed_ticket_files) ? draft.proposed_ticket_files : [],
        proposed_table_files: Array.isArray(draft.proposed_table_files) ? draft.proposed_table_files : [],
      });
      setSelectedDj(
        draft.dj
          ? {
              id: draft.dj.id,
              name: draft.dj.name,
              picture_url: draft.dj.picture_url ?? null,
              music_style: draft.dj.music_style ?? null,
              price: draft.dj.price ?? null,
              email: draft.dj.email ?? "",
            }
          : null
      );
      if (draft.starts_at) setStartsAtDate(new Date(draft.starts_at));
      if (draft.ends_at) setEndsAtDate(new Date(draft.ends_at));
    },
    [form]
  );

  // Handle Continue with existing draft
  const handleContinueDraft = useCallback(() => {
    if (existingDraft) {
      loadDraft(existingDraft);
      setShowDraftDialog(false);
      setHasUserStarted(true);
    }
  }, [existingDraft, loadDraft]);

  // Handle New event (delete old draft in background so UI doesn't block)
  const handleNewEvent = useCallback(() => {
    const idToDelete = draftId;
    setExistingDraft(null);
    setDraftId(null);
    setDraftShortId(null);
    setShowDraftDialog(false);
    setHasUserStarted(true);
    form.reset();
    setStartsAtDate(undefined);
    setEndsAtDate(undefined);
    setSelectedVenue(null);
    setSelectedDj(null);
    if (idToDelete) {
      deleteEventMutation.mutate(idToDelete);
    }
  }, [draftId, deleteEventMutation, form]);

  // Auto-save draft function (skipped while form is submitting)
  const autoSaveDraft = useCallback(async () => {
    if (!hasUserStarted) return;
    if (isSubmittingRef.current) return;

    const formData = form.getValues();

    // Check if form has minimum required data (title at least)
    if (!formData.title || !formData.title.trim()) {
      return;
    }

    const submitData = {
      ...formData,
      starts_at: startsAtDate ? startsAtDate.toISOString() : null,
      ends_at: endsAtDate ? endsAtDate.toISOString() : null,
    };

    const handleAutoSaveError = (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
      const isNotFound =
        msg.includes("not found") ||
        (err &&
          typeof err === "object" &&
          "response" in err &&
          typeof (err as { response?: { status?: number } }).response?.status === "number" &&
          (err as { response: { status: number } }).response.status === 404);
      if (isNotFound && draftId) {
        setDraftId(null);
        setDraftShortId(null);
      }
      console.error("Auto-save failed:", err);
    };

    if (!draftId) {
      // Create new draft only when all required fields pass validation (POST requires full create schema)
      const parsed = createEventSchema.safeParse(submitData);
      if (!parsed.success) return; // Skip create until form is complete; no error to user
      try {
        const draftResult = await createEventMutation.mutateAsync(parsed.data);
        setDraftId(draftResult.id);
        if (draftResult.short_id) setDraftShortId(draftResult.short_id);
        setLastAutoSave(new Date());
      } catch (err) {
        handleAutoSaveError(err);
      }
      return;
    }

    try {
      // Update existing draft with partial data (PUT uses update schema; partial is allowed)
      await updateEventMutation.mutateAsync({ id: draftId, input: submitData });
      setLastAutoSave(new Date());
    } catch (err) {
      handleAutoSaveError(err);
    }
  }, [hasUserStarted, draftId, startsAtDate, endsAtDate, form, createEventMutation, updateEventMutation]);

  // Auto-save every 20 seconds (only via timer, not when changing steps)
  useEffect(() => {
    if (!hasUserStarted) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up auto-save timer
    autoSaveTimerRef.current = setInterval(() => {
      autoSaveDraft();
    }, 20000); // 20 seconds

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [hasUserStarted, autoSaveDraft]);

  // Form submit handler
  const submitFormData = useCallback(
    async (data: EventFormData) => {
      isSubmittingRef.current = true;
      try {
        const submitData: CreateEventInput = {
          ...data,
          starts_at: startsAtDate ? startsAtDate.toISOString() : null,
          ends_at: endsAtDate ? endsAtDate.toISOString() : null,
        };

        // Global Director: verify OTP then create event as approved (no approval chain)
        if (profile?.role === "global_director") {
          setPendingEventData(submitData);
          setShowOtpDialog(true);
          return;
        }

        // Save draft first (create or update)
        let eventId = draftId;
        if (!eventId) {
          // Create new draft
          const draftResult = await createEventMutation.mutateAsync(submitData);
          eventId = draftResult.id;
          setDraftId(draftResult.id);
          if (draftResult.short_id) {
            setDraftShortId(draftResult.short_id);
          }
        } else {
          // Update existing draft only if it's still a draft
          try {
            const updated = await updateEventMutation.mutateAsync({ id: eventId, input: submitData });
            if (updated.short_id) {
              setDraftShortId(updated.short_id);
            }
          } catch (error: unknown) {
            // If draft not found or not a draft anymore, create new one or skip update
            const errorMessage = error && typeof error === "object" && "message" in error ? String(error.message) : "";
            const isNotFound =
              (error &&
                typeof error === "object" &&
                "response" in error &&
                typeof error.response === "object" &&
                error.response !== null &&
                "status" in error.response &&
                error.response.status === 404) ||
              errorMessage.includes("not found");

            const isNotDraft = errorMessage.includes("Only draft events can be updated");

            if (isNotFound) {
              const draftResult = await createEventMutation.mutateAsync(submitData);
              eventId = draftResult.id;
              setDraftId(draftResult.id);
              if (draftResult.short_id) {
                setDraftShortId(draftResult.short_id);
              }
            } else if (isNotDraft) {
              // Event is no longer a draft (already submitted), skip update and just proceed
              console.log("Event already submitted, proceeding to submit again");
            } else {
              throw error;
            }
          }
        }

        // Submit draft for approval
        if (eventId) {
          await submitEventMutation.mutateAsync(eventId);
          router.push("/dashboard/events/requests?tab=in-review");
        }
      } catch (error) {
        // Error is handled by the mutation
        console.error("Submit error:", error);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [
      startsAtDate,
      endsAtDate,
      draftId,
      profile?.role,
      createEventMutation,
      updateEventMutation,
      submitEventMutation,
      router,
    ]
  );

  const handleEventCreateOtpVerified = useCallback(
    async (verificationToken: string) => {
      if (!pendingEventData) return;
      setShowOtpDialog(false);
      // Clear draft id and stop auto-save so we never PUT the old (deleted) draft
      setDraftId(null);
      setDraftShortId(null);
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      try {
        const event = await createEventMutation.mutateAsync({
          ...pendingEventData,
          verificationToken,
        });
        setPendingEventData(null);
        if (event.short_id) {
          router.push(`/dashboard/events/${event.short_id}`);
        } else {
          router.push("/dashboard/events/requests");
        }
      } catch (error) {
        console.error("Failed to create event after OTP:", error);
        setPendingEventData(null);
      }
    },
    [pendingEventData, createEventMutation, router]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      form.handleSubmit(submitFormData)(e);
    },
    [form, submitFormData]
  );

  const handleVenueSelect = useCallback(
    (venue: VenueWithCreator | null) => {
      setSelectedVenue(venue);
      form.setValue("venue_id", venue?.id || null, { shouldValidate: true });
    },
    [form]
  );

  const handleDjSelect = useCallback(
    (dj: DJ | null) => {
      setSelectedDj(
        dj
          ? {
              id: dj.id,
              name: dj.name,
              picture_url: dj.picture_url,
              music_style: dj.music_style,
              price: dj.price,
              email: dj.email,
            }
          : null
      );
      form.setValue("dj_id", dj?.id || null, { shouldValidate: true });
    },
    [form]
  );

  const maxAttendance = useMemo(() => selectedVenue?.total_capacity ?? undefined, [selectedVenue]);

  const expectedAttendance = form.watch("expected_attendance");
  const attendanceError = useMemo(() => {
    if (maxAttendance && expectedAttendance && expectedAttendance > maxAttendance) {
      return `Expected attendance cannot exceed venue capacity (${maxAttendance.toLocaleString()})`;
    }
    return undefined;
  }, [maxAttendance, expectedAttendance]);

  const renderFormFields = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Event Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Event Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Enter event title"
          {...form.register("title")}
          className={cn(form.formState.errors.title && "border-destructive")}
          maxLength={200}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {form.formState.errors.title.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{form.watch("title")?.length || 0} / 200 characters</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Venue Selection */}
        <div className="space-y-2">
          <Label>
            Venue <span className="text-destructive">*</span>
          </Label>
          <VenueSelectionDisplay
            selectedVenue={selectedVenue}
            onSelect={() => setShowVenueDialog(true)}
            error={form.formState.errors.venue_id?.message}
            maxAttendance={maxAttendance}
            currentAttendance={expectedAttendance}
          />
        </div>

        {/* DJ Selection */}
        <div className="space-y-2">
          <Label>
            DJ <span className="text-destructive">*</span>
          </Label>
          {selectedDj ? (
            <div className="space-y-3">
              <div className="border rounded-lg bg-card flex flex-wrap overflow-hidden items-center justify-between">
                <div className="relative h-48 w-full">
                  <Image
                    src={selectedDj.picture_url!}
                    alt={selectedDj.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium">{selectedDj.name}</p>
                  {selectedDj.music_style && <p className="text-sm text-muted-foreground">{selectedDj.music_style}</p>}
                </div>
              </div>
              <Button className="w-full" type="button" variant="outline" onClick={() => setShowDjDialog(true)}>
                Change DJ
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-auto py-12 border-2 border-dashed",
                  form.formState.errors.dj_id ? "border-destructive" : "hover:border-primary"
                )}
                onClick={() => setShowDjDialog(true)}
              >
                <div className="flex flex-col items-center justify-center gap-3 w-full text-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    <Disc3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Select a DJ</p>
                    <p className="text-sm text-muted-foreground">Assign a DJ to your event</p>
                  </div>
                </div>
              </Button>
              {form.formState.errors.dj_id && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{form.formState.errors.dj_id.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expected Attendance */}
      <div className="space-y-2">
        <Label htmlFor="expected_attendance" className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          Expected Attendance <span className="text-destructive">*</span>
          {maxAttendance && (
            <span className="pl-1 text-xs text-muted-foreground font-normal">
              (Max: {maxAttendance.toLocaleString()})
            </span>
          )}
        </Label>
        <Input
          id="expected_attendance"
          type="number"
          min="1"
          max={maxAttendance || undefined}
          placeholder="Enter expected number of attendees"
          {...form.register("expected_attendance", {
            valueAsNumber: true,
            max: maxAttendance || undefined,
          })}
          className={cn(
            form.formState.errors.expected_attendance && "border-destructive",
            attendanceError && "border-destructive"
          )}
        />
        {form.formState.errors.expected_attendance && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {form.formState.errors.expected_attendance.message}
          </p>
        )}
        {attendanceError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {attendanceError}
          </p>
        )}
        {maxAttendance && expectedAttendance && expectedAttendance <= maxAttendance && (
          <p className="text-xs text-muted-foreground">{maxAttendance - expectedAttendance} capacity remaining</p>
        )}
      </div>

      {/* Start and end date & time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePickerNew
          label="Starts At *"
          value={startsAtDate}
          onChange={(date) => {
            setStartsAtDate(date);
            form.setValue("starts_at", date ? date.toISOString() : null, { shouldValidate: true });
          }}
          error={form.formState.errors.starts_at?.message}
          placeholder="Select start date and time"
        />
        <DateTimePickerNew
          label="Ends At *"
          value={endsAtDate}
          onChange={(date) => {
            setEndsAtDate(date);
            form.setValue("ends_at", date ? date.toISOString() : null, { shouldValidate: true });
          }}
          error={form.formState.errors.ends_at?.message}
          placeholder="Select end date and time"
        />
      </div>

      {/* Minimum ticket price & table price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="minimum_ticket_price" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Min. ticket price <span className="text-destructive">*</span>
          </Label>
          <PriceInput
            id="minimum_ticket_price"
            placeholder="0.00"
            value={form.watch("minimum_ticket_price")}
            onChange={(value) => {
              form.setValue("minimum_ticket_price", value ?? null, { shouldValidate: true });
            }}
            className={cn(form.formState.errors.minimum_ticket_price && "border-destructive")}
          />
          {form.formState.errors.minimum_ticket_price && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {form.formState.errors.minimum_ticket_price.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimum_table_price" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Min. table price <span className="text-destructive">*</span>
          </Label>
          <PriceInput
            id="minimum_table_price"
            placeholder="0.00"
            value={form.watch("minimum_table_price")}
            onChange={(value) => {
              form.setValue("minimum_table_price", value ?? null, { shouldValidate: true });
            }}
            className={cn(form.formState.errors.minimum_table_price && "border-destructive")}
          />
          {form.formState.errors.minimum_table_price && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {form.formState.errors.minimum_table_price.message}
            </p>
          )}
        </div>
      </div>

      {/* Proposed ticket and table files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EventProposedFileUpload
          label="Proposed ticket categories and prices"
          value={form.watch("proposed_ticket_files") ?? []}
          onChange={(files) => form.setValue("proposed_ticket_files", files, { shouldValidate: true })}
          error={form.formState.errors.proposed_ticket_files?.message}
        />
        <EventProposedFileUpload
          label="Proposed table layout, categories and prices"
          value={form.watch("proposed_table_files") ?? []}
          onChange={(files) => form.setValue("proposed_table_files", files, { shouldValidate: true })}
          error={form.formState.errors.proposed_table_files?.message}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Enter event notes (optional)"
          rows={6}
          {...form.register("notes")}
          className={cn(form.formState.errors.notes && "border-destructive")}
          maxLength={5000}
        />
        {form.formState.errors.notes && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {form.formState.errors.notes.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{form.watch("notes")?.length || 0} / 5,000 characters</p>
      </div>
    </div>
  );

  if (isLoadingDraft) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = createEventMutation.isPending || updateEventMutation.isPending || submitEventMutation.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-4xl mx-auto pb-4 sm:pb-8 px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-2 sm:gap-1">
        <div className="flex justify-between w-full">
          <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
            <Link href="/dashboard/events/requests?tab=drafts">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Event Requests</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>

        <div className="w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span>Create New Event</span>

            {(draftShortId || shortId) && (
              <span className="text-xs sm:text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded w-fit">
                {draftShortId || shortId}
              </span>
            )}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
            <p className="text-sm sm:text-base text-muted-foreground">Create a draft event to submit for approval</p>
            {lastAutoSave && (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="font-medium">Auto-saved</span>
                <span className="opacity-80 hidden sm:inline">at {new Date(lastAutoSave).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {renderFormFields()}

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto sm:min-w-[160px]">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit for Approval
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Draft Dialog - Only shows once on initial load if draft exists */}
      <DraftDialog
        open={showDraftDialog && !hasUserStarted}
        onOpenChange={(open) => {
          // Once user has started, never show dialog again
          if (hasUserStarted) {
            return;
          }
          setShowDraftDialog(open);
        }}
        existingDraft={existingDraft}
        onContinue={handleContinueDraft}
        onStartNew={handleNewEvent}
        hasUserStarted={hasUserStarted}
      />

      {/* Venue Selection Dialog */}
      <VenueSelectionDialog
        open={showVenueDialog}
        onOpenChange={setShowVenueDialog}
        selectedVenueId={form.watch("venue_id") || null}
        onSelectVenue={handleVenueSelect}
      />

      {/* DJ Selection Dialog */}
      <DJSelectionDialog
        open={showDjDialog}
        onOpenChange={setShowDjDialog}
        selectedDjId={form.watch("dj_id") || null}
        onSelectDj={handleDjSelect}
      />

      {/* OTP verification for Global Director event create */}
      {profile?.id && (
        <OtpVerificationDialog
          open={showOtpDialog}
          onOpenChange={(open) => {
            setShowOtpDialog(open);
            if (!open) {
              setPendingEventData(null);
              isSubmittingRef.current = false;
            }
          }}
          onVerified={handleEventCreateOtpVerified}
          contextType="event_create"
          contextId={profile.id}
          action="create"
          title="Verify before creating event"
          description="We sent a verification code to your email. Enter it below to create the event (no approval needed)."
        />
      )}
    </div>
  );
}
