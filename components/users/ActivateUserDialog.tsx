/**
 * Activate User Dialog Component
 *
 * Dialog for activating pending users and assigning roles/permissions
 * Global Director only
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activateUserSchema, type ActivateUserInput } from "@/lib/validation/users.schema";
import { activateUser } from "@/lib/actions/auth.actions";
import { getPotentialParents } from "@/lib/actions/users";
import { useLocationById } from "@/lib/hooks/use-locations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCombobox } from "@/components/ui/user-combobox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/lib/types/database.types";
import { UserRole, ROLE_OPTIONS } from "@/lib/types/roles";

type User = Database["public"]["Tables"]["users"]["Row"];

interface ActivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

// Filter out Global Director from activation options
const roleOptions = ROLE_OPTIONS.filter((option) => option.value !== UserRole.GLOBAL_DIRECTOR);

export function ActivateUserDialog({ open, onOpenChange, user }: ActivateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [potentialParents, setPotentialParents] = useState<
    Array<{ id: string; first_name: string; last_name: string | null; email: string; role: string }>
  >([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);

  const form = useForm<ActivateUserInput>({
    resolver: zodResolver(activateUserSchema),
    defaultValues: {
      userId: user.id,
      role: UserRole.EVENT_PLANNER,
      parent_id: null,
    },
  });

  const selectedRole = form.watch("role");

  // Get location name for display (read-only)
  const { data: countryData } = useLocationById(open ? user.country_id || null : null);

  // Load potential parents when dialog opens and role changes
  useEffect(() => {
    if (open && selectedRole && selectedRole !== UserRole.GLOBAL_DIRECTOR) {
      loadPotentialParents(selectedRole);
    } else if (selectedRole === UserRole.GLOBAL_DIRECTOR) {
      // Clear parents for Global Director
      setPotentialParents([]);
      form.setValue("parent_id", null);
      setIsLoadingParents(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedRole]);

  const loadPotentialParents = async (role: string) => {
    setIsLoadingParents(true);
    try {
      const response = await getPotentialParents(role);
      if (response.success && response.data) {
        setPotentialParents(response.data);
      }
    } finally {
      setIsLoadingParents(false);
    }
  };

  const onSubmit = async (data: ActivateUserInput) => {
    setIsSubmitting(true);

    try {
      const response = await activateUser(data);

      if (response.success) {
        const fullName = user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
        toast.success(`User ${fullName} activated successfully`);
        onOpenChange(false);
        form.reset();
        window.location.reload();
      } else {
        toast.error(response.error || "Failed to activate user");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Activate user error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (role: string) => {
    form.setValue("role", role as UserRole);

    if (role === UserRole.GLOBAL_DIRECTOR) {
      form.setValue("parent_id", null);
      setPotentialParents([]);
      setIsLoadingParents(false);
    } else {
      await loadPotentialParents(role);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activate User</DialogTitle>
          <DialogDescription>
            Activate {user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name} and assign role and
            permissions. Location information can be edited later if needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* User Info (Read-only) */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">
                  {user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{user.phone}</p>
                </div>
              )}
              {countryData && (
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="font-medium">{countryData.name}</p>
                </div>
              )}
              {user.city && (
                <div>
                  <Label className="text-muted-foreground">City</Label>
                  <p className="font-medium">{user.city}</p>
                </div>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
            )}
          </div>

          {/* Reports To (if not Global Director) */}
          {selectedRole && selectedRole !== UserRole.GLOBAL_DIRECTOR && (
            <div className="space-y-2">
              <UserCombobox
                value={form.watch("parent_id")}
                onValueChange={(value) => form.setValue("parent_id", value)}
                options={potentialParents}
                placeholder="Select reports to..."
                loading={isLoadingParents}
                label="Reports To *"
                error={form.formState.errors.parent_id?.message}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
