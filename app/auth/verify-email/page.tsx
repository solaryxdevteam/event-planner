/**
 * Verify Email Page
 * User enters OTP sent to their email after registration to activate account
 */

"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 2 * 60;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
      setResendSecondsLeft(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const canResend = resendSecondsLeft <= 0 && email.trim().length > 0;

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    try {
      const response = await fetch("/api/otp/user-email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("A new verification code has been sent to your email.");
        setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      } else {
        toast.error(result.error || "Failed to resend code");
        if (typeof result.retryAfterSeconds === "number" && result.retryAfterSeconds > 0) {
          setResendAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
          setResendSecondsLeft(result.retryAfterSeconds);
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code from your email`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/otp/user-email-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Email verified! Signing you in…");
        if (result.loginUrl) {
          window.location.href = result.loginUrl;
        } else {
          router.push("/dashboard/profile");
          router.refresh();
        }
      } else {
        toast.error(result.error || "Verification failed");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Enter the {OTP_LENGTH}-digit code we sent to your email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Verification code</Label>
              <InputOTP
                autoFocus
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(value) => setOtp(value)}
                disabled={isSubmitting}
              >
                <InputOTPGroup className="justify-center">
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-center text-sm text-muted-foreground">
                {canResend ? (
                  <button
                    type="button"
                    className="underline hover:no-underline disabled:opacity-50"
                    onClick={handleResend}
                    disabled={isResending}
                  >
                    {isResending ? "Sending..." : "Resend code"}
                  </button>
                ) : (
                  <span>Resend code in {formatCountdown(resendSecondsLeft)}</span>
                )}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify and activate account"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button type="button" className="underline hover:no-underline" onClick={() => router.push("/auth/login")}>
                Back to login
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
