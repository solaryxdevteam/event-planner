"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signOut } from "@/lib/auth/client";
import type { User } from "@/lib/types/database.types";

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 2 * 60;

interface ProfileChangeEmailProps {
  user: User;
}

export function ProfileChangeEmail({ user }: ProfileChangeEmailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const isPending = user.status === "pending";

  const requestOtp = useCallback(
    async (email: string) => {
      if (isRequesting) return;
      setIsRequesting(true);
      try {
        const res = await fetch("/api/profile/change-email/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message || "Failed to send code");
          if (res.status === 429) setResendCooldown(RESEND_COOLDOWN_SECONDS);
          return;
        }
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        toast.success("Verification code sent to your new email address.");
        if (data.otpCode != null) {
          console.log("[Change email OTP]:", data.otpCode);
          toast.info(`Dev: Your OTP is ${data.otpCode}`, { duration: 15_000 });
        }
      } catch {
        toast.error("Failed to send verification code.");
      } finally {
        setIsRequesting(false);
      }
    },
    [isRequesting]
  );

  const handleSendCode = () => {
    const email = newEmail.trim();
    if (!email) {
      toast.error("Please enter your new email address.");
      return;
    }
    if (email.toLowerCase() === (user.email ?? "").trim().toLowerCase()) {
      toast.error("New email must be different from your current email.");
      return;
    }
    setPendingNewEmail(email);
    setOtpDialogOpen(true);
    setOtpCode("");
    requestOtp(email);
  };

  const handleVerify = useCallback(
    async (codeOverride?: string) => {
      const code = (codeOverride ?? otpCode).replace(/\s/g, "");
      if (code.length !== OTP_LENGTH || !pendingNewEmail) return;
      setIsVerifying(true);
      try {
        const res = await fetch("/api/profile/change-email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: pendingNewEmail, code }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message || "Invalid code");
          return;
        }
        toast.success(data.message || "Email updated. Please sign in with your new email.");
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        setOtpDialogOpen(false);
        setPendingNewEmail(null);
        setNewEmail("");
        setOtpCode("");
        await signOut();
        router.push("/auth/login");
      } catch {
        toast.error("Verification failed.");
      } finally {
        setIsVerifying(false);
      }
    },
    [otpCode, pendingNewEmail, queryClient, router]
  );

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    if (value.replace(/\s/g, "").length === OTP_LENGTH && pendingNewEmail && !isVerifying && !isRequesting) {
      handleVerify(value);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResend = () => {
    if (pendingNewEmail && resendCooldown <= 0) requestOtp(pendingNewEmail);
  };

  if (isPending) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Change email</CardTitle>
          <CardDescription>
            Update your account email. We will send a verification code to your new email; you must verify it before the
            change is applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">New email</Label>
            <div className="flex gap-2">
              <Input
                id="new-email"
                type="email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isRequesting}
              />
              <Button type="button" onClick={handleSendCode} disabled={isRequesting}>
                {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={otpDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOtpCode("");
            setResendCooldown(0);
          }
          setOtpDialogOpen(open);
          if (!open) setPendingNewEmail(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your new email</DialogTitle>
            <DialogDescription>
              We sent a 4-digit code to {pendingNewEmail}. Enter it below to confirm the change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="flex justify-center">
              <InputOTP maxLength={OTP_LENGTH} value={otpCode} onChange={handleOtpChange}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Code valid for 2 minutes.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resendCooldown > 0 || isRequesting}
                onClick={handleResend}
              >
                {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {resendCooldown > 0
                  ? `Resend in ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, "0")}`
                  : "Resend code"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtpDialogOpen(false)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button
              onClick={() => handleVerify()}
              disabled={otpCode.replace(/\s/g, "").length !== OTP_LENGTH || isVerifying || isRequesting}
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
