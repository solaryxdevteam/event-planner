/**
 * Pending Activation Page
 * Shown to users who have registered but are awaiting activation
 * Located under dashboard so pending users can access it
 */

export const dynamic = "force-dynamic";

import { getServerUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default async function PendingPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/auth/login");
  }

  // If user is active, redirect to dashboard
  if (user.dbUser.status === "active") {
    redirect("/dashboard");
  }

  // If user is inactive, redirect to login
  if (user.dbUser.status === "inactive") {
    redirect("/auth/login");
  }

  // User is pending - show pending message
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
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
          <p className="text-xs text-muted-foreground text-center pt-2">
            All dashboard features are disabled until your account is activated. You can sign out using the menu in the
            top right.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
