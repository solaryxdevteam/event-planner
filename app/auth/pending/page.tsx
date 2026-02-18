/**
 * Pending Activation Page
 * Shown to users who have registered but are awaiting activation
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/client";
import Image from "next/image";

export default function PendingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and their status
    async function checkStatus() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // TODO: Check user status from database
      // If status is 'active', redirect to dashboard
      // For now, we'll just show the pending message
    }

    checkStatus();
  }, [router]);

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
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-center">Account Pending Activation</CardTitle>
          <CardDescription className="text-center">Your registration was successful!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Your account has been created and is currently pending activation. A Global Director will review your
            registration and activate your account soon.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            You will receive an email notification once your account has been activated.
          </p>
          <div className="pt-4">
            <Button variant="outline" onClick={() => router.push("/auth/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
