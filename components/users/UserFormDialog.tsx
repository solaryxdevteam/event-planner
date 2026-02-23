/**
 * User Form Dialog Component
 *
 * Dialog for creating or editing users
 * Includes form validation, role selection, parent selection, and Global Director password confirmation
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserFormSchema,
  updateUserFormSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFormInput,
} from "@/lib/validation/users.schema";
import * as usersClientService from "@/lib/services/client/users.client.service";
import { ApiError } from "@/lib/services/client/api-client";
import { useCountries, useDefaultCountry } from "@/lib/hooks/use-locations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { InputPasswordStrength } from "@/components/ui/input-password-strength";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Database } from "@/lib/types/database.types";
import { UserRole, ROLE_OPTIONS } from "@/lib/types/roles";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user?: User;
}

export function UserFormDialog({ open, onOpenChange, mode, user }: UserFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [password, setPassword] = useState("");

  // Form type - use UserFormInput which works for both create and edit
  type FormData = UserFormInput;

  const form = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(mode === "create" ? createUserFormSchema : updateUserFormSchema) as any,
    defaultValues: {
      email: "",
      first_name: "",
      last_name: null,
      role: UserRole.EVENT_PLANNER,
      parent_id: null,
      country_id: undefined,
      city: null,
      phone: null,
      password: "",
    },
  });

  // Load user data when in edit mode
  useEffect(() => {
    if (open && mode === "edit" && user) {
      form.reset({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        parent_id: user.parent_id,
        country_id: user.country_id || undefined,
        city: user.city || null,
        phone: user.phone,
        password: "", // Password field is empty for security
      });
    } else if (open && mode === "create") {
      // Reset form for create mode
      form.reset({
        email: "",
        first_name: "",
        last_name: null,
        role: UserRole.EVENT_PLANNER,
        parent_id: null,
        country_id: undefined,
        city: null,
        phone: null,
        password: "",
      });
      setShowPasswordConfirm(false);
      setPassword("");
    }
  }, [open, mode, user, form]);

  const selectedCountryId = form.watch("country_id");

  // Use React Query hooks for location data (cached)
  const { data: countriesData = [], isLoading: loadingCountries } = useCountries();
  const { data: defaultCountry } = useDefaultCountry();

  // Transform data for the combobox
  const countries = countriesData.map((c) => ({ id: c.id, name: c.name }));
  const defaultCountryId = defaultCountry?.id || null;

  // Set default country when it loads and dialog opens
  useEffect(() => {
    if (open && defaultCountryId && !selectedCountryId) {
      form.setValue("country_id", defaultCountryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCountryId, selectedCountryId]);

  const selectedRole = form.watch("role");
  // When role changes to Global Director, clear parent; otherwise keep or clear based on hierarchy
  const handleRoleChange = (role: string) => {
    form.setValue("role", role as UserRole);

    if (role === UserRole.GLOBAL_DIRECTOR) {
      if (mode === "create") {
        setShowPasswordConfirm(true);
      }
      form.setValue("parent_id", null);
    } else {
      setShowPasswordConfirm(false);
      // In edit mode, if current parent is invalid for new role, clear it (UserSearchCombobox will allow re-select)
      if (mode === "edit" && user?.parent_id) {
        // Keep parent_id; validation will happen on submit. Optionally clear if you want to force re-select.
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        // Password is required for direct user creation
        const userPassword = form.getValues("password") || password;

        if (!userPassword || userPassword.length < 8) {
          toast.error("Password is required and must be at least 8 characters");
          setIsSubmitting(false);
          return;
        }

        // If creating Global Director, verify password confirmation first
        if (data.role === UserRole.GLOBAL_DIRECTOR) {
          const valid = await usersClientService.checkGlobalDirectorPassword(password);
          if (!valid) {
            toast.error("Incorrect Global Director password");
            setIsSubmitting(false);
            return;
          }
        }

        // Create user via client service (calls POST /api/users)
        await usersClientService.createUser({
          ...data,
          password: userPassword,
        } as CreateUserInput & { password: string });

        const fullName = data.last_name ? `${data.first_name} ${data.last_name}` : data.first_name;
        toast.success(`User ${fullName} created successfully`);
        onOpenChange(false);
        form.reset();
        setPassword("");
        router.refresh();
      } else {
        // Edit mode - update user
        if (!user) {
          toast.error("User data is missing");
          setIsSubmitting(false);
          return;
        }

        // Prepare update data (only include changed fields)
        const updateData: Partial<UpdateUserInput> = {};
        if (data.email !== undefined && data.email !== user.email) updateData.email = data.email;
        if (data.first_name !== undefined && data.first_name !== user.first_name)
          updateData.first_name = data.first_name;
        if (data.last_name !== undefined && data.last_name !== user.last_name) updateData.last_name = data.last_name;
        if (data.role !== undefined && data.role !== user.role) updateData.role = data.role;
        if (data.parent_id !== undefined && data.parent_id !== user.parent_id) updateData.parent_id = data.parent_id;
        if (data.country_id !== undefined && data.country_id !== user.country_id)
          updateData.country_id = data.country_id;
        if (data.city !== undefined && data.city !== null) updateData.city = data.city;
        if (data.phone !== undefined && data.phone !== user.phone) updateData.phone = data.phone;

        // Only include password if it's provided (not empty)
        const newPassword = form.getValues("password");
        if (newPassword && newPassword.length >= 8) {
          updateData.password = newPassword;
        }

        // If changing to Global Director, verify password confirmation
        if (updateData.role === UserRole.GLOBAL_DIRECTOR && user.role !== UserRole.GLOBAL_DIRECTOR) {
          if (!password) {
            toast.error("Global Director password confirmation is required");
            setIsSubmitting(false);
            return;
          }
          const valid = await usersClientService.checkGlobalDirectorPassword(password);
          if (!valid) {
            toast.error("Incorrect Global Director password");
            setIsSubmitting(false);
            return;
          }
        }

        await usersClientService.updateUser(user.id, updateData as UpdateUserInput);
        const fullName = data.last_name ? `${data.first_name} ${data.last_name}` : data.first_name;
        toast.success(`User ${fullName} updated successfully`);
        onOpenChange(false);
        form.reset();
        setPassword("");
        router.refresh();
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
        console.error(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New User" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new user to the system. Set a password for immediate access."
              : "Update user information and permissions."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto">
              {/* Left Column */}

              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" {...form.register("first_name")} placeholder="John" />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" {...form.register("last_name")} placeholder="Doe" />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="user@example.com" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
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
                <div className="col-span-2">
                  <UserSearchCombobox
                    value={form.watch("parent_id") ?? null}
                    onValueChange={(value) => form.setValue("parent_id", value)}
                    role={selectedRole}
                    excludeUserId={mode === "edit" && user ? user.id : undefined}
                    placeholder="Search by name or email..."
                    label="Reports To *"
                    error={form.formState.errors.parent_id?.message}
                  />
                </div>
              )}

              {/* Country */}
              <LocationCombobox
                value={form.watch("country_id") || defaultCountryId || undefined}
                onValueChange={(value) => form.setValue("country_id", value)}
                options={countries}
                placeholder="Select country"
                loading={loadingCountries}
                label="Country *"
                error={form.formState.errors.country_id?.message}
              />

              {/* City - Text Input */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" type="text" {...form.register("city")} placeholder="Enter city name" />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                )}
              </div>

              {/* Phone - Full width on mobile */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  id="phone"
                  value={form.watch("phone") || ""}
                  onChange={(value) => form.setValue("phone", value || null)}
                  placeholder="+1 (234) 567-8900"
                  defaultCountry="US"
                />
              </div>

              {/* Password */}
              <div className="space-y-2 col-span-2">
                {mode === "create" ? (
                  <InputPasswordStrength
                    value={form.watch("password") || ""}
                    onChange={(value) => form.setValue("password", value)}
                    label="Password *"
                    placeholder="Enter password"
                    error={form.formState.errors.password?.message}
                  />
                ) : (
                  <>
                    <InputPasswordStrength
                      value={form.watch("password") || ""}
                      onChange={(value) => form.setValue("password", value)}
                      label="New Password"
                      placeholder="Leave empty to keep current password"
                      error={form.formState.errors.password?.message}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only enter a new password if you want to change it. Leave empty to keep the current password.
                    </p>
                  </>
                )}
              </div>

              {/* Global Director Password Confirmation */}
              {showPasswordConfirm && (
                <div className="space-y-2 rounded-lg border border-amber-500 bg-amber-50 p-4">
                  <Label htmlFor="gd-password" className="text-amber-900">
                    Global Director Password *
                  </Label>
                  <p className="text-sm text-amber-700">
                    {mode === "create"
                      ? "Creating a Global Director requires password confirmation."
                      : "Changing role to Global Director requires password confirmation."}
                  </p>
                  <PasswordInput
                    id="gd-password"
                    placeholder="Enter Global Director password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button className="flex-1" type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create User" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
