"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import type { VerificationOtpContextType, VerificationOtpAction } from "@/lib/types/database.types";

const OTP_LENGTH = 4;

const RESEND_COOLDOWN_SECONDS = 2 * 60; // 2 minutes

export interface OtpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (verificationToken: string) => void;
  contextType: VerificationOtpContextType;
  contextId: string;
  action: VerificationOtpAction;
  title?: string;
  description?: string;
}

export function OtpVerificationDialog({
  open,
  onOpenChange,
  onVerified,
  contextType,
  contextId,
  action,
  title = "Verify your identity",
  description = "We sent a verification code to your email. Enter it below to continue.",
}: OtpVerificationDialogProps) {
  const [code, setCode] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const prevOpenRef = useRef(false);

  const requestOtp = useCallback(async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      const res = await fetch("/api/verification-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType, contextId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to send code");
        if (res.status === 429) setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Verification code sent to your email.");
    } catch {
      toast.error("Failed to send verification code.");
    } finally {
      setIsRequesting(false);
    }
  }, [contextType, contextId, action, isRequesting]);

  // Auto-request OTP when dialog opens (once per open)
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened && contextId) {
      setCode("");
      requestOtp();
    }
  }, [open, contextId, requestOtp]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleVerify = async () => {
    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length !== OTP_LENGTH) {
      toast.error("Please enter the 4-digit code from your email.");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch("/api/verification-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType, contextId, action, code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Invalid code");
        return;
      }
      onVerified(data.verificationToken);
      onOpenChange(false);
    } catch {
      toast.error("Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCode("");
      setResendCooldown(0);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center">
            <InputOTP maxLength={OTP_LENGTH} value={code} onChange={setCode}>
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
              onClick={requestOtp}
            >
              {resendCooldown > 0
                ? `Resend in ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, "0")}`
                : "Resend code"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isVerifying}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={code.replace(/\s/g, "").length !== OTP_LENGTH || isVerifying}>
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
