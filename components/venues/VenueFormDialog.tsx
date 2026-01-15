"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVenueSchema, updateVenueSchema, type CreateVenueInput } from "@/lib/validation/venues.schema";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { AlertTriangleIcon } from "lucide-react";

interface VenueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue?: VenueWithCreator;
  onSubmit: (data: CreateVenueInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function VenueFormDialog({ open, onOpenChange, venue, onSubmit, isSubmitting }: VenueFormDialogProps) {
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const isEditing = !!venue;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateVenueInput>({
    resolver: zodResolver(isEditing ? updateVenueSchema : createVenueSchema),
    defaultValues: venue
      ? {
          name: venue.name,
          address: venue.address,
          city: venue.city,
          capacity: venue.capacity ?? undefined,
          notes: venue.notes ?? undefined,
        }
      : undefined,
  });

  const handleFormSubmit = async (data: CreateVenueInput) => {
    try {
      await onSubmit(data);
      reset();
      setShowDuplicateWarning(false);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleClose = () => {
    reset();
    setShowDuplicateWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Venue" : "Create New Venue"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the venue details below."
              : "Add a new venue to the system. Make sure all information is accurate."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {showDuplicateWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex items-start gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Duplicate Warning</p>
                <p className="mt-1">A venue with similar name, address, and city already exists.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Venue Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register("name")} placeholder="Conference Center" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="123 Main Street"
              aria-invalid={!!errors.address}
            />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-destructive">*</span>
            </Label>
            <Input id="city" {...register("city")} placeholder="San Francisco" aria-invalid={!!errors.city} />
            {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (Optional)</Label>
            <Input
              id="capacity"
              type="number"
              {...register("capacity", { valueAsNumber: true })}
              placeholder="500"
              aria-invalid={!!errors.capacity}
            />
            {errors.capacity && <p className="text-sm text-destructive">{errors.capacity.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional information about the venue..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!errors.notes}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Venue" : "Create Venue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
