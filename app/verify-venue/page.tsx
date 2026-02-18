"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { VerifyVenueSummary } from "@/components/venues/VerifyVenueSummary";
import type { VerifyVenueInfo } from "@/lib/services/venues/venue-contact-verification.service";

function VerifyVenueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [venue, setVenue] = useState<VerifyVenueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const loadVenue = useCallback(async () => {
    if (!token) {
      setError("Invalid link. No token provided.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/verify-venue?token=${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setError("This link has expired or has already been used.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to load verification page.");
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setVenue(json.data);
      } else {
        setError("Invalid link.");
      }
    } catch {
      setError("Failed to load verification page.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  // When already verified (e.g. after refresh), redirect to login
  useEffect(() => {
    if (!loading && error && error.includes("already been used")) {
      const t = setTimeout(() => {
        router.replace("/auth/login");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [loading, error, router]);

  const handleVerify = async () => {
    if (!token || otp.length !== 4) {
      setVerifyError("Please enter the 4-digit code from your email.");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/verify-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: otp }),
      });
      const json = await res.json();
      if (json.success) {
        setVerified(true);
      } else {
        setVerifyError(json.error || "Verification failed.");
      }
    } catch {
      setVerifyError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleRedirectToLogin = () => {
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-xl font-semibold text-destructive">Invalid or expired link</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              You will be redirected to the login page shortly, or you can click below.
            </p>
            <Button onClick={handleRedirectToLogin} className="w-full">
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold">Thank you!</h1>
            <p className="text-muted-foreground">
              Your email has been verified for this venue. You can close this page.
            </p>
            <Button onClick={handleRedirectToLogin} className="w-full">
              Go to login
            </Button>
            <p className="text-xs text-muted-foreground">If you refresh this page, you will be redirected to login.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 4-digit code sent to your email. The code is valid for 12 hours.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <VerifyVenueSummary venue={venue} />

            <div className="space-y-2 flex flex-col items-center justify-center">
              <label className="text-sm font-medium">Verification code</label>
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setVerifyError(null);
                }}
              >
                <InputOTPGroup className="justify-center">
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}

            <Button className="w-full" onClick={handleVerify} disabled={verifying || otp.length !== 4}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify email"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyVenuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyVenueContent />
    </Suspense>
  );
}
