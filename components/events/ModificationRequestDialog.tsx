"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimePickerNew } from "@/components/ui/date-time-picker-new";
import { createEventSchema, type CreateEventInput } from "@/lib/validation/events.schema";
import { useRequestModification } from "@/lib/hooks/use-events";
import { Loader2, AlertCircle } from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { VenueSelectionDialog } from "@/components/events/VenueSelectionDialog";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { VenueCard } from "@/components/venues/VenueCard";
import { PriceInput } from "@/components/ui/price-input";
import { useVenue } from "@/lib/hooks/use-venues";
import { cn } from "@/lib/utils";
import { getCurrencyForCountry } from "@/lib/utils/country-currency";

interface ModificationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventWithRelations;
}

type ModificationFormData = CreateEventInput & {
  changeReason?: string;
};

export function ModificationRequestDialog({ open, onOpenChange, event }: ModificationRequestDialogProps) {
  const [startsAtDate, setStartsAtDate] = useState<Date | undefined>(
    event.starts_at ? new Date(event.starts_at) : undefined
  );
  const [endsAtDate, setEndsAtDate] = useState<Date | undefined>(event.ends_at ? new Date(event.ends_at) : undefined);
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithCreator | null>(null);

  const requestModificationMutation = useRequestModification();

  const form = useForm<ModificationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEventSchema) as any,
    mode: "onChange",
    defaultValues: {
      title: event.title,
      description: event.description || "",
      starts_at: event.starts_at || null,
      ends_at: event.ends_at || null,
      venue_id: event.venue_id || null,
      expected_attendance: event.expected_attendance || null,
      budget_amount: event.budget_amount || null,
      budget_currency: event.budget_currency || "USD",
      notes: event.notes || null,
      changeReason: "",
    },
  });

  // Fetch full venue if venue_id exists
  // React Compiler warning: form.watch() returns functions that cannot be memoized
  // This is expected behavior with React Hook Form and can be safely ignored
  const venueId = form.watch("venue_id");
  const { data: fullVenue } = useVenue(venueId || null);

  // Update selected venue when full venue is loaded
  useEffect(() => {
    if (fullVenue) {
      setSelectedVenue(fullVenue);
    }
  }, [fullVenue]);

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: event.title,
        description: event.description || "",
        starts_at: event.starts_at || null,
        ends_at: event.ends_at || null,
        venue_id: event.venue_id || null,
        expected_attendance: event.expected_attendance || null,
        budget_amount: event.budget_amount || null,
        budget_currency: event.budget_currency || "USD",
        notes: event.notes || null,
        changeReason: "",
      });
      setStartsAtDate(event.starts_at ? new Date(event.starts_at) : undefined);
      setEndsAtDate(event.ends_at ? new Date(event.ends_at) : undefined);
      // Selected venue will be populated from fullVenue or via venue picker
      setSelectedVenue(null);
    }
  }, [open, event, form]);

  const handleVenueSelect = (venue: VenueWithCreator | null) => {
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
  };

  const maxAttendance = selectedVenue
    ? (selectedVenue.capacity_seated || 0) + (selectedVenue.capacity_standing || 0)
    : undefined;

  const expectedAttendance = form.watch("expected_attendance");
  const attendanceError =
    maxAttendance && expectedAttendance && expectedAttendance > maxAttendance
      ? `Expected attendance cannot exceed venue capacity (${maxAttendance.toLocaleString()})`
      : undefined;

  const onSubmit = async (data: ModificationFormData) => {
    try {
      const { changeReason, ...modificationData } = data;

      await requestModificationMutation.mutateAsync({
        id: event.id,
        modificationData: {
          ...modificationData,
          starts_at: startsAtDate ? startsAtDate.toISOString() : null,
          ends_at: endsAtDate ? endsAtDate.toISOString() : null,
        },
        changeReason: changeReason || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to request modification:", error);
    }
  };

  const isPending = requestModificationMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Modification</DialogTitle>
            <DialogDescription>
              Modify the event details below. Changes will go through the approval process.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Change Reason */}
            <div className="space-y-2">
              <Label htmlFor="changeReason">Reason for Modification (Optional)</Label>
              <Textarea
                id="changeReason"
                placeholder="Explain why you're requesting these changes..."
                {...form.register("changeReason")}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {form.watch("changeReason")?.length || 0} / 500 characters
              </p>
            </div>

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
            </div>

            {/* Venue Selection */}
            <div className="space-y-2">
              <Label>Venue</Label>
              {selectedVenue ? (
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden bg-card">
                    <VenueCard venue={selectedVenue} onDelete={() => {}} userRole="EVENT_PLANNER" />
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowVenueDialog(true)}>
                    Change Venue
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setShowVenueDialog(true)}>
                  Select Venue
                </Button>
              )}
            </div>

            {/* Expected Attendance */}
            <div className="space-y-2">
              <Label htmlFor="expected_attendance">
                Expected Attendance
                {maxAttendance && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
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
                className={cn((form.formState.errors.expected_attendance || attendanceError) && "border-destructive")}
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
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Budget</Label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
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
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter event description (optional)"
                rows={6}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Modification"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Venue Selection Dialog */}
      <VenueSelectionDialog
        open={showVenueDialog}
        onOpenChange={setShowVenueDialog}
        selectedVenueId={form.watch("venue_id") || null}
        onSelectVenue={handleVenueSelect}
      />
    </>
  );
}
