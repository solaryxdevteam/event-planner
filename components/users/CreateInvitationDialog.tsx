/**
 * Create Invitation Dialog Component
 *
 * Dialog for creating invitation links
 * Requires country selection before creating invitation
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvitationSchema, type CreateInvitationInput } from "@/lib/validation/invitations.schema";
import { createInvitation } from "@/lib/actions/invitations";
import { useCountries } from "@/lib/hooks/use-locations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvitationDialog({ open, onOpenChange }: CreateInvitationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<{ token: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Use React Query hook for countries (cached)
  const { data: countriesData = [], isLoading: loadingCountries } = useCountries();
  const countries = countriesData.map((c) => ({ id: c.id, name: c.name }));

  const form = useForm<CreateInvitationInput>({
    // @ts-expect-error - zodResolver type inference issue with optional fields that have defaults
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: "",
      country_id: "",
      expires_in_days: 3,
    },
  });

  const selectedCountryId = form.watch("country_id");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setCreatedInvitation(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: CreateInvitationInput) => {
    // Validate country is selected
    if (!data.country_id) {
      toast.error("Please select a country");
      return;
    }

    // Ensure expires_in_days is set (default to 3 if not provided)
    const submissionData = {
      ...data,
      expires_in_days: data.expires_in_days ?? 3,
    };

    setIsSubmitting(true);

    try {
      const result = await createInvitation(submissionData);

      if (result.success && result.data) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const invitationLink = `${baseUrl}/auth/register?token=${result.data.token}`;

        setCreatedInvitation({
          token: result.data.token,
          link: invitationLink,
        });

        toast.success("Invitation created successfully!");
        form.reset();
      } else {
        toast.error(result.success === false ? result.error : "Failed to create invitation");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Create invitation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdInvitation) {
      try {
        await navigator.clipboard.writeText(createdInvitation.link);
        setCopied(true);
        toast.success("Invitation link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  if (createdInvitation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation Created</DialogTitle>
            <DialogDescription>The invitation link has been created and sent via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Invitation Link:</strong>
                <div className="mt-2 flex items-center gap-2">
                  <Input value={createdInvitation.link} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedInvitation(null);
                  form.reset();
                }}
              >
                Create Another
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invitation</DialogTitle>
          <DialogDescription>
            Create an invitation link for a new user. Country must be selected before creating.
          </DialogDescription>
        </DialogHeader>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...form.register("email")}
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <LocationCombobox
            value={form.watch("country_id") || undefined}
            onValueChange={(value) => form.setValue("country_id", value || "")}
            options={countries}
            placeholder="Select country"
            loading={loadingCountries}
            label="Country *"
            error={form.formState.errors.country_id?.message}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <Label htmlFor="expires_in_days">Expires In (Days)</Label>
            <Select
              value={(form.watch("expires_in_days") ?? 3).toString()}
              onValueChange={(value) => form.setValue("expires_in_days", parseInt(value, 10))}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day} {day === 1 ? "day" : "days"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.expires_in_days && (
              <p className="text-sm text-destructive">{form.formState.errors.expires_in_days.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Default: 3 days</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" type="submit" disabled={isSubmitting || !selectedCountryId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invitation"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
