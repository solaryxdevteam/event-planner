"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { PasswordInput } from "@/components/ui/password-input";
import { InputPasswordStrength } from "@/components/ui/input-password-strength";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/lib/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile.schema";
import { useStatesByCountry } from "@/lib/hooks/use-locations";
import { signOut } from "@/lib/auth/client";
import type { User, UserStatus } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Check if user is pending - if so, disable all fields
  const isPending = user.status === "pending";

  // Check if user is Global Director (can edit role, email, status)
  const isGlobalDirector = user.role === UserRole.GLOBAL_DIRECTOR;

  const form = useForm<UpdateProfileInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateProfileSchema) as any,
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name ?? undefined,
      company: user.company ?? undefined,
      state_id: user.state_id ?? undefined,
      city: user.city ?? undefined,
      phone: user.phone ?? undefined,
      password: undefined,
      password_confirmation: undefined,
      // Global Director fields
      email: isGlobalDirector ? user.email : undefined,
      role: isGlobalDirector ? user.role : undefined,
      status: isGlobalDirector ? user.status : undefined,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (response) => {
      if (response.success && response.data) {
        // Invalidate profile queries
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        // Update the form with new data
        form.reset({
          first_name: response.data.first_name,
          last_name: response.data.last_name ?? undefined,
          company: response.data.company ?? undefined,
          state_id: response.data.state_id ?? undefined,
          city: response.data.city ?? undefined,
          phone: response.data.phone ?? undefined,
          password: undefined,
          password_confirmation: undefined,
          email: isGlobalDirector ? response.data.email : undefined,
          role: isGlobalDirector ? response.data.role : undefined,
          status: isGlobalDirector ? response.data.status : undefined,
        });
        // If password was changed, sign out and redirect to login
        if ("passwordChanged" in response.data && response.data.passwordChanged) {
          toast.success("Password updated. Please sign in with your new password.");
          await signOut();
          router.push("/auth/login");
          return;
        }
        toast.success("Profile updated successfully");
        // Reset password fields after successful update
        if (showPasswordFields) {
          setShowPasswordFields(false);
        }
      } else if (!response.success) {
        toast.error(response.error || "Failed to update profile");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    // Only include password if it was provided and not empty
    const submitData: UpdateProfileInput = {
      first_name: data.first_name,
      last_name: data.last_name || undefined,
      company: data.company || undefined,
      state_id: data.state_id || undefined,
      city: data.city || undefined,
      phone: data.phone && data.phone.trim() !== "" ? data.phone : undefined,
    };

    if (data.password && data.password.trim() !== "") {
      submitData.password = data.password;
      submitData.password_confirmation = data.password_confirmation || "";
    }

    // Only include admin fields if user is Global Director
    if (isGlobalDirector) {
      if (data.email !== undefined) submitData.email = data.email;
      if (data.role !== undefined) submitData.role = data.role;
      if (data.status !== undefined) submitData.status = data.status;
    }

    updateProfileMutation.mutate(submitData);
  };

  const selectedCountryId = user.country_id; // Country is read-only

  // Reload states when country changes (though country shouldn't change)
  const { data: currentStates = [], isLoading: currentStatesLoading } = useStatesByCountry(selectedCountryId);

  if (isPending) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your account is pending activation. You cannot update your profile until your account is activated by an
              administrator.
            </p>
          </div>
          <div className="space-y-4 opacity-60">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={user.first_name} disabled />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={user.last_name || ""} disabled />
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Input value={user.company || ""} disabled />
            </div>
            <div>
              <Label>State</Label>
              <Input value="N/A" disabled />
            </div>
            <div>
              <Label>City</Label>
              <Input value={user.city || "N/A"} disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={user.phone || ""} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="first_name">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input id="first_name" {...form.register("first_name")} disabled={updateProfileMutation.isPending} />
          {form.formState.errors.first_name && (
            <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" {...form.register("last_name")} disabled={updateProfileMutation.isPending} />
          {form.formState.errors.last_name && (
            <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" {...form.register("company")} disabled={updateProfileMutation.isPending} />
        {form.formState.errors.company && (
          <p className="text-sm text-destructive">{form.formState.errors.company.message}</p>
        )}
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label>State</Label>
        {/* React Compiler warning: form.watch() returns functions that cannot be memoized - expected with React Hook Form */}
        <LocationCombobox
          value={form.watch("state_id") ?? undefined}
          onValueChange={(value) => {
            form.setValue("state_id", value ?? undefined);
          }}
          options={currentStates.map((state) => ({ id: state.id, name: state.name }))}
          placeholder="Select state..."
          disabled={updateProfileMutation.isPending}
          loading={currentStatesLoading}
        />
        {form.formState.errors.state_id && (
          <p className="text-sm text-destructive">{form.formState.errors.state_id.message}</p>
        )}
      </div>

      {/* City - Text Field */}
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          {...form.register("city")}
          placeholder="Enter city name"
          disabled={updateProfileMutation.isPending}
        />
        {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label>Phone</Label>
        <PhoneInput
          value={form.watch("phone") || undefined}
          onChange={(value) => {
            // Convert empty string to undefined for validation
            const phoneValue = value && value.trim() !== "" ? value : undefined;
            form.setValue("phone", phoneValue || "", { shouldValidate: true });
          }}
          disabled={updateProfileMutation.isPending}
          defaultCountry="US"
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        )}
      </div>

      {/* Password Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Password</Label>
            <p className="text-sm text-muted-foreground">Leave blank to keep your current password</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPasswordFields(!showPasswordFields);
              if (showPasswordFields) {
                form.setValue("password", undefined);
                form.setValue("password_confirmation", undefined);
              }
            }}
            disabled={updateProfileMutation.isPending}
          >
            {showPasswordFields ? "Cancel" : "Change Password"}
          </Button>
        </div>

        {showPasswordFields && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <InputPasswordStrength
                value={form.watch("password") || ""}
                onChange={(value) => form.setValue("password", value)}
                label=""
                placeholder="Enter new password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <PasswordInput
                id="password_confirmation"
                value={form.watch("password_confirmation") || ""}
                onChange={(e) => form.setValue("password_confirmation", e.target.value)}
                placeholder="Confirm new password"
                disabled={updateProfileMutation.isPending}
              />
              {form.formState.errors.password_confirmation && (
                <p className="text-sm text-destructive">{form.formState.errors.password_confirmation.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global Director Only Fields */}
      {isGlobalDirector && (
        <div className="space-y-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Administrator Settings</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
              These fields can only be edited by Global Directors
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" {...form.register("email")} disabled={updateProfileMutation.isPending} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as UserRole)}
                disabled={updateProfileMutation.isPending}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.EVENT_PLANNER}>Event Planner</SelectItem>
                  <SelectItem value={UserRole.CITY_CURATOR}>City Curator</SelectItem>
                  <SelectItem value={UserRole.REGIONAL_CURATOR}>Regional Curator</SelectItem>
                  <SelectItem value={UserRole.LEAD_CURATOR}>Lead Curator</SelectItem>
                  <SelectItem value={UserRole.GLOBAL_DIRECTOR}>Global Director</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as UserStatus)}
                disabled={updateProfileMutation.isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
