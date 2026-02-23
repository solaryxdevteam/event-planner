/**
 * Registration Page
 * User registration with invitation token
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocationById } from "@/lib/hooks/use-locations";
import { signInWithPassword } from "@/lib/auth/client";
import { encryptPassword } from "@/lib/utils/password-encryption.client";
import { useValidateInvitation } from "@/lib/hooks/use-invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/phone-input";
import { InputPasswordStrength } from "@/components/ui/input-password-strength";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const token = (params?.token as string) ?? "";

  const { data: invitationData, isLoading, error: validationError } = useValidateInvitation(token || null);
  const { data: countryData } = useLocationById(invitationData?.country_id ?? null);

  const [invitation, setInvitation] = useState<{ email: string; country_id: string; country_name?: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    confirmPassword: "",
  });

  // When invitation is validated and country loaded, set email and invitation with country name
  useEffect(() => {
    if (!invitationData?.country_id || !invitationData?.email) return;

    setFormData((prev) => ({ ...prev, email: invitationData.email }));
    setInvitation({
      email: invitationData.email,
      country_id: invitationData.country_id,
      country_name: countryData?.name ?? "Country",
    });
  }, [invitationData?.country_id, invitationData?.email, countryData?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.first_name || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      // Encrypt password before sending (or use plain text in development if key not configured)
      let encryptedPassword: string;
      try {
        encryptedPassword = await encryptPassword(formData.password);
      } catch (err) {
        // If encryption fails, show user-friendly error
        const errorMessage = err instanceof Error ? err.message : "Failed to encrypt password";
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Register user via API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          first_name: formData.first_name,
          last_name: formData.last_name || null,
          email: formData.email,
          phone: formData.phone || null,
          city: formData.city || null,
          password: encryptedPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Registration successful! Check your email for a verification code.");

        // Redirect to verify email page (user must enter OTP to activate account)
        if (result.needsEmailVerification) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
          router.refresh();
          return;
        }

        // Fallback: sign in if no verification required
        const signInResult = await signInWithPassword(formData.email, formData.password);
        if (signInResult.success) {
          router.push("/dashboard/profile");
          router.refresh();
        } else {
          router.push("/auth/login");
        }
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Registration error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>This invitation link is invalid or missing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/auth/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || (invitationData && !invitation)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-2">
            <div className="mx-auto">
              <Image
                src="/images/shiraz-house-logo.webp"
                alt="Shiraz House"
                width={120}
                height={48}
                priority
                className="h-12 w-auto object-contain"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-2">
              <Image
                src="/images/shiraz-house-logo.webp"
                alt="Shiraz House"
                width={120}
                height={48}
                priority
                className="h-12 w-auto object-contain"
              />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>This invitation link is invalid or has expired</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(validationError as Error).message}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push("/auth/login")} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="mx-auto mb-2">
            <Image
              src="/images/shiraz-house-logo.webp"
              alt="Shiraz House"
              width={120}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />
          </div>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>Fill in your details to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Invitation Information Section */}
          {invitation && (
            <div className="mb-6 rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Invitation Details</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium">{invitation.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-medium">{invitation.country_name || "Country"}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter city name"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              {/* Right Column */}
              {/* Phone */}
              <div className="space-y-2">
                <Label>Phone</Label>
                <PhoneInput
                  value={formData.phone || ""}
                  onChange={(value) => setFormData({ ...formData, phone: value || "" })}
                  placeholder="+1 (234) 567-8900"
                  defaultCountry="US"
                />
              </div>

              {/* Password */}
              <InputPasswordStrength
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                label="Password *"
                placeholder="Enter your password"
              />

              {/* Confirm Password */}
              <PasswordInput
                id="confirmPassword"
                label="Confirm Password *"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={isSubmitting}
                required
                minLength={8}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
