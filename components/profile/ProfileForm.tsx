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
import { PasswordInput } from "@/components/ui/password-input";
import { InputPasswordStrength } from "@/components/ui/input-password-strength";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import { updateProfile } from "@/lib/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile.schema";
import { signOut } from "@/lib/auth/client";
import type { User } from "@/lib/types/database.types";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordChangeOtpOpen, setPasswordChangeOtpOpen] = useState(false);
  /** When user submits with new password, we show OTP first; after verify we submit this data with the token */
  const [pendingSubmitData, setPendingSubmitData] = useState<UpdateProfileInput | null>(null);

  // Check if user is pending - if so, disable all fields
  const isPending = user.status === "pending";

  const form = useForm<UpdateProfileInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateProfileSchema) as any,
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name ?? undefined,
      city: user.city ?? undefined,
      phone: user.phone ?? undefined,
      password: undefined,
      password_confirmation: undefined,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (response) => {
      if (response.success && response.data) {
        // If password was changed, sign out and redirect immediately without invalidating queries
        // (invalidation would trigger refetches that run after sign-out and cause 401)
        if ("passwordChanged" in response.data && response.data.passwordChanged) {
          toast.success("Password updated. Please sign in with your new password.");
          await signOut();
          router.push("/auth/login");
          return;
        }
        // Normal profile update: invalidate and reset form
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        form.reset({
          first_name: response.data.first_name,
          last_name: response.data.last_name ?? undefined,
          city: response.data.city ?? undefined,
          phone: response.data.phone ?? undefined,
          password: undefined,
          password_confirmation: undefined,
        });
        toast.success("Profile updated successfully");
        if (showPasswordFields) {
          setShowPasswordFields(false);
          setPendingSubmitData(null);
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
    const submitData: UpdateProfileInput = {
      first_name: data.first_name,
      last_name: data.last_name || undefined,
      city: data.city || undefined,
      phone: data.phone && data.phone.trim() !== "" ? data.phone : undefined,
    };

    const hasPassword = data.password && data.password.trim() !== "";
    if (hasPassword) {
      submitData.password = data.password;
      submitData.password_confirmation = data.password_confirmation || "";
    }

    // If user is changing password, require OTP verification after submit: open OTP dialog and submit after they verify
    if (hasPassword) {
      setPendingSubmitData(submitData);
      setPasswordChangeOtpOpen(true);
      return;
    }

    updateProfileMutation.mutate(submitData);
  };

  const handlePasswordOtpVerified = (verificationToken: string) => {
    if (!pendingSubmitData) {
      setPasswordChangeOtpOpen(false);
      return;
    }
    const submitData: UpdateProfileInput = {
      ...pendingSubmitData,
      password_change_verification_token: verificationToken,
    };
    setPendingSubmitData(null);
    setPasswordChangeOtpOpen(false);
    updateProfileMutation.mutate(submitData);
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordFields(false);
    setPendingSubmitData(null);
    form.setValue("password", undefined);
    form.setValue("password_confirmation", undefined);
  };

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

        {/* City - Text Field */}
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            {...form.register("city")}
            placeholder="Enter city name"
            disabled={updateProfileMutation.isPending}
          />
          {form.formState.errors.city && (
            <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
          )}
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
      </div>

      {/* Password Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Password</Label>
            <p className="text-sm text-muted-foreground">
              Leave blank to keep your current password. When you save with a new password, we will send a verification
              code to your email.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (showPasswordFields) {
                handleCancelPasswordChange();
              } else {
                setShowPasswordFields(true);
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

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <OtpVerificationDialog
        open={passwordChangeOtpOpen}
        onOpenChange={(open) => {
          setPasswordChangeOtpOpen(open);
          if (!open) setPendingSubmitData(null);
        }}
        onVerified={handlePasswordOtpVerified}
        contextType="password_change"
        contextId={user.id}
        action="change"
        title="Verify to change password"
        description="We sent a 4-digit code to your email. Enter it below to confirm the password change."
      />
    </form>
  );
}
