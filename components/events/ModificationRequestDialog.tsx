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
import { Loader2, AlertCircle, Disc3 } from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { VenueSelectionDialog } from "@/components/events/VenueSelectionDialog";
import { DJSelectionDialog } from "@/components/events/DJSelectionDialog";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { DJ } from "@/lib/types/database.types";
import { VenueCard } from "@/components/venues/VenueCard";
import { PriceInput } from "@/components/ui/price-input";
import { useVenue } from "@/lib/hooks/use-venues";
import { useDj } from "@/lib/hooks/use-djs";
import { cn } from "@/lib/utils";

type DJDisplay = Pick<DJ, "id" | "name" | "picture_url" | "music_style" | "price" | "email">;

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
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithCreator | null>(null);
  const [showDjDialog, setShowDjDialog] = useState(false);
  const [selectedDj, setSelectedDj] = useState<DJDisplay | null>(null);

  const requestModificationMutation = useRequestModification();

  const form = useForm<ModificationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEventSchema) as any,
    mode: "onChange",
    defaultValues: {
      title: event.title,
      starts_at: event.starts_at || null,
      venue_id: event.venue_id || null,
      dj_id: event.dj_id ?? event.dj?.id ?? null,
      expected_attendance: event.expected_attendance || null,
      minimum_ticket_price: event.minimum_ticket_price ?? null,
      minimum_table_price: event.minimum_table_price ?? null,
      notes: event.notes || null,
      changeReason: "",
    },
  });

  // Fetch full venue if venue_id exists
  // React Compiler warning: form.watch() returns functions that cannot be memoized
  // This is expected behavior with React Hook Form and can be safely ignored
  const venueId = form.watch("venue_id");
  const { data: fullVenue } = useVenue(venueId || null);
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
      setSelectedDj({
        id: fullDj.id,
        name: fullDj.name,
        picture_url: fullDj.picture_url,
        music_style: fullDj.music_style,
        price: fullDj.price,
        email: fullDj.email,
      });
    }
  }, [fullDj]);

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      const initialDjId = event.dj_id ?? event.dj?.id ?? null;
      form.reset({
        title: event.title,
        starts_at: event.starts_at || null,
        venue_id: event.venue_id || null,
        dj_id: initialDjId,
        expected_attendance: event.expected_attendance || null,
        minimum_ticket_price: event.minimum_ticket_price ?? null,
        minimum_table_price: event.minimum_table_price ?? null,
        notes: event.notes || null,
        changeReason: "",
      });
      setStartsAtDate(event.starts_at ? new Date(event.starts_at) : undefined);
      setSelectedVenue(null);
      setSelectedDj(null);
    }
  }, [open, event, form]);

  const handleVenueSelect = (venue: VenueWithCreator | null) => {
    setSelectedVenue(venue);
    form.setValue("venue_id", venue?.id || null, { shouldValidate: true });
  };

  const handleSelectDj = (dj: DJ | null) => {
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
  };

  const maxAttendance = selectedVenue?.total_capacity ?? undefined;

  const expectedAttendance = form.watch("expected_attendance");
  const attendanceError =
    maxAttendance && expectedAttendance && expectedAttendance > maxAttendance
      ? `Expected attendance cannot exceed venue capacity (${maxAttendance.toLocaleString()})`
      : undefined;

  const onSubmit = async (data: ModificationFormData) => {
    try {
      // changeReason is not in createEventSchema so Zod strips it from validated data; read from form state
      const changeReason = form.getValues("changeReason")?.trim() || undefined;

      await requestModificationMutation.mutateAsync({
        id: event.id,
        modificationData: {
          ...data,
          starts_at: startsAtDate ? startsAtDate.toISOString() : null,
        },
        changeReason,
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

            {/* DJ Selection */}
            <div className="space-y-2">
              <Label>
                DJ <span className="text-destructive">*</span>
              </Label>
              {selectedDj ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4 bg-card flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{selectedDj.name}</p>
                      {selectedDj.music_style && (
                        <p className="text-sm text-muted-foreground">{selectedDj.music_style}</p>
                      )}
                      {selectedDj.price != null && (
                        <p className="text-sm font-medium mt-1">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          }).format(Number(selectedDj.price))}
                        </p>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDjDialog(true)}>
                      Change DJ
                    </Button>
                  </div>
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
                      <div className="flex flex-col items-center justify-center gap-3 w-full text-center">
                        <div className="flex flex-col items-center justify-center gap-3 w-full text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <Disc3 className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">Select a DJ</p>
                            <p className="text-sm text-muted-foreground">Assign a DJ to your event</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Button>
                  {form.formState.errors.dj_id && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {form.formState.errors.dj_id.message}
                    </p>
                  )}
                </div>
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
            <div className="grid grid-cols-1 gap-4">
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
            </div>

            {/* Min ticket & table price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minimum_ticket_price">Min. ticket price</Label>
                <PriceInput
                  id="minimum_ticket_price"
                  placeholder="0.00"
                  value={form.watch("minimum_ticket_price")}
                  onChange={(value) => form.setValue("minimum_ticket_price", value ?? null, { shouldValidate: true })}
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
                <Label htmlFor="minimum_table_price">Min. table price</Label>
                <PriceInput
                  id="minimum_table_price"
                  placeholder="0.00"
                  value={form.watch("minimum_table_price")}
                  onChange={(value) => form.setValue("minimum_table_price", value ?? null, { shouldValidate: true })}
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

      {/* DJ Selection Dialog */}
      <DJSelectionDialog
        open={showDjDialog}
        onOpenChange={setShowDjDialog}
        selectedDjId={form.watch("dj_id") || null}
        onSelectDj={handleSelectDj}
      />
    </>
  );
}
