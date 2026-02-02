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
  UsersIcon,
  CheckCircle2,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { VenueSelectionDialog } from "@/components/events/VenueSelectionDialog";
import { DraftDialog } from "@/components/events/DraftDialog";
import { StepIndicator } from "@/components/events/StepIndicator";
import { VenueCard } from "@/components/venues/VenueCard";
import { PriceInput } from "@/components/ui/price-input";
import { useVenue } from "@/lib/hooks/use-venues";
import { cn } from "@/lib/utils";
import { getCurrencyForCountry } from "@/lib/utils/country-currency";

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
  if (selectedVenue) {
    return (
      <div className="space-y-3">
        <div className="border rounded-lg overflow-hidden bg-card">
          <VenueCard venue={selectedVenue} onDelete={() => {}} userRole="EVENT_PLANNER" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={onSelect}>
          <MapPinIcon className="mr-2 h-4 w-4" />
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
  const [currentStep, setCurrentStep] = useState(1);
  const [startsAtDate, setStartsAtDate] = useState<Date | undefined>();
  const [endsAtDate, setEndsAtDate] = useState<Date | undefined>();
  const [existingDraft, setExistingDraft] = useState<EventWithRelations | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(eventId || null);
  const [draftShortId, setDraftShortId] = useState<string | null>(shortId || null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithCreator | null>(null);
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const dialogShownRef = useRef(false);
  const currentStepRef = useRef(currentStep);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      description: "",
      starts_at: null,
      ends_at: null,
      venue_id: null,
      expected_attendance: null,
      budget_amount: null,
      budget_currency: "USD",
      notes: null,
    },
  });

  // Fetch full venue if venue_id exists
  const venueId = form.watch("venue_id");
  const { data: fullVenue } = useVenue(venueId || null);

  // Update selected venue when full venue is loaded
  useEffect(() => {
    if (fullVenue) {
      setSelectedVenue(fullVenue);
    }
  }, [fullVenue]);

  // Update ref when currentStep changes
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

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
        description: draft.description || "",
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
        venue_id: draft.venue_id || null,
        expected_attendance: draft.expected_attendance || null,
        budget_amount: draft.budget_amount || null,
        budget_currency: draft.budget_currency || "USD",
        notes: draft.notes || null,
      });

      if (draft.starts_at) {
        setStartsAtDate(new Date(draft.starts_at));
      }
      if (draft.ends_at) {
        setEndsAtDate(new Date(draft.ends_at));
      }
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

  // Handle New event (delete old draft)
  const handleNewEvent = useCallback(async () => {
    if (draftId) {
      try {
        await deleteEventMutation.mutateAsync(draftId);
      } catch (error) {
        console.error("Error deleting draft:", error);
      }
    }
    setExistingDraft(null);
    setDraftId(null);
    setDraftShortId(null);
    setShowDraftDialog(false);
    setHasUserStarted(true);
    form.reset();
    setStartsAtDate(undefined);
    setEndsAtDate(undefined);
    setSelectedVenue(null);
  }, [draftId, deleteEventMutation, form]);

  const totalSteps = 2;

  const getStepFields = useCallback((step: number): (keyof EventFormData)[] => {
    switch (step) {
      case 1:
        return ["title", "venue_id", "expected_attendance"];
      case 2:
        return ["starts_at", "ends_at", "description", "budget_amount", "budget_currency"];
      default:
        return [];
    }
  }, []);

  const stepErrors = useMemo(() => {
    const errors: Record<number, boolean> = {};
    [1, 2].forEach((step) => {
      const fields = getStepFields(step);
      errors[step] = fields.some((field) => !!form.formState.errors[field]);
    });
    return errors;
  }, [form.formState.errors, getStepFields]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => {
      const prevStep = Math.max(prev - 1, 1);
      currentStepRef.current = prevStep;
      return prevStep;
    });
  }, []);

  // Auto-save draft function
  const autoSaveDraft = useCallback(async () => {
    if (!hasUserStarted) return;

    const formData = form.getValues();

    // Check if form has minimum required data
    if (!formData.title || !formData.title.trim()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        starts_at: startsAtDate ? startsAtDate.toISOString() : null,
        ends_at: endsAtDate ? endsAtDate.toISOString() : null,
      };

      if (!draftId) {
        // Create new draft
        const draftResult = await createEventMutation.mutateAsync(submitData);
        setDraftId(draftResult.id);
        if (draftResult.short_id) {
          setDraftShortId(draftResult.short_id);
        }
        setLastAutoSave(new Date());
      } else {
        // Update existing draft (silently - mutations already configured not to show toast)
        await updateEventMutation.mutateAsync({ id: draftId, input: submitData });
        setLastAutoSave(new Date());
      }
    } catch (error) {
      // Silently fail auto-save
      console.error("Auto-save failed:", error);
    }
  }, [hasUserStarted, draftId, startsAtDate, endsAtDate, form, createEventMutation, updateEventMutation]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!hasUserStarted) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up auto-save timer
    autoSaveTimerRef.current = setInterval(() => {
      autoSaveDraft();
    }, 10000); // 10 seconds

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [hasUserStarted, autoSaveDraft]);

  // Handle next with auto-save
  const handleNext = useCallback(async () => {
    const fields = getStepFields(currentStep);
    const isValid = await form.trigger(fields);

    if (isValid) {
      // Auto-save before moving to next step
      await autoSaveDraft();

      setCurrentStep((prev) => {
        const nextStep = Math.min(prev + 1, totalSteps);
        currentStepRef.current = nextStep;
        return nextStep;
      });
    }
  }, [currentStep, form, getStepFields, totalSteps, autoSaveDraft]);

  // Form submit handler - only submits on final step
  const submitFormData = useCallback(
    async (data: EventFormData) => {
      // Double check - only submit if on final step (use ref to ensure latest value)
      if (currentStepRef.current < totalSteps) {
        return;
      }

      try {
        const submitData = {
          ...data,
          starts_at: startsAtDate ? startsAtDate.toISOString() : null,
          ends_at: endsAtDate ? endsAtDate.toISOString() : null,
        };

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
      }
    },
    [
      currentStep,
      totalSteps,
      startsAtDate,
      endsAtDate,
      draftId,
      createEventMutation,
      updateEventMutation,
      submitEventMutation,
      router,
    ]
  );

  // Wrap handleSubmit to prevent execution if not on final step
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      // Double-check before allowing react-hook-form's handleSubmit to run
      if (currentStepRef.current < totalSteps) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      form.handleSubmit(submitFormData)(e);
    },
    [form, submitFormData, totalSteps]
  );

  const handleVenueSelect = useCallback(
    (venue: VenueWithCreator | null) => {
      setSelectedVenue(venue);
      form.setValue("venue_id", venue?.id || null, { shouldValidate: true });

      // Auto-set currency based on venue country code
      if (venue?.country_location?.code) {
        const currency = getCurrencyForCountry(venue.country_location);
        form.setValue("budget_currency", currency, {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: false,
        });
      } else {
        form.setValue("budget_currency", "USD", {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: false,
        });
      }
    },
    [form]
  );

  // Calculate max attendance based on selected venue
  const maxAttendance = useMemo(
    () => (selectedVenue ? (selectedVenue.capacity_seated || 0) + (selectedVenue.capacity_standing || 0) : undefined),
    [selectedVenue]
  );

  const expectedAttendance = form.watch("expected_attendance");
  const attendanceError = useMemo(() => {
    if (maxAttendance && expectedAttendance && expectedAttendance > maxAttendance) {
      return `Expected attendance cannot exceed venue capacity (${maxAttendance.toLocaleString()})`;
    }
    return undefined;
  }, [maxAttendance, expectedAttendance]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentStep < totalSteps) {
                    e.preventDefault();
                  }
                }}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.title.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{form.watch("title")?.length || 0} / 200 characters</p>
            </div>

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

            {/* Expected Attendance */}
            <div className="space-y-2">
              <Label htmlFor="expected_attendance" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Expected Attendance
                {maxAttendance && (
                  <span className="text-xs text-muted-foreground font-normal">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentStep < totalSteps) {
                    e.preventDefault();
                  }
                }}
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                min={startsAtDate}
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </Label>
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3">
                <div className="space-y-1">
                  <PriceInput
                    id="budget_amount"
                    placeholder="0.00"
                    value={form.watch("budget_amount")}
                    onChange={(value) => {
                      form.setValue("budget_amount", value || null, { shouldValidate: true });
                    }}
                    className={cn(form.formState.errors.budget_amount && "border-destructive")}
                  />
                  {form.formState.errors.budget_amount && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.budget_amount.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="h-10 px-4 bg-muted border border-input rounded-md flex items-center justify-center min-w-[80px]">
                    <span className="text-sm font-medium">{form.watch("budget_currency") || "USD"}</span>
                  </div>
                </div>
              </div>
              {form.watch("budget_currency") && selectedVenue?.country_location && (
                <p className="text-xs text-muted-foreground">
                  Currency automatically set based on venue location ({selectedVenue.country_location.name})
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter event description (optional)"
                rows={8}
                {...form.register("description")}
                className={cn(form.formState.errors.description && "border-destructive")}
                maxLength={5000}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.description.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {form.watch("description")?.length || 0} / 5,000 characters
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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

      {/* Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        onStepClick={(step) => {
          const fields = getStepFields(step);
          form.trigger(fields).then((isValid) => {
            if (isValid || currentStep > step) {
              currentStepRef.current = step;
              setCurrentStep(step);
            }
          });
        }}
        stepErrors={stepErrors}
      />

      {/* Form Card */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <form
            onSubmit={(e) => {
              // Prevent form submission unless on final step
              if (currentStep < totalSteps) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              // Only submit on final step
              handleSubmit(e);
            }}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting form unless on final step
              if (e.key === "Enter" && currentStep < totalSteps) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className="space-y-4 sm:space-y-6"
          >
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 pt-4 sm:pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || isPending}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNext} disabled={isPending} className="w-full sm:w-auto">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
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
              )}
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
    </div>
  );
}
