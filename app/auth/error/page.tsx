/**
 * Auth Error Page
 * Displays authentication errors
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "An authentication error occurred";

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
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>There was a problem signing you in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{message}</div>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/auth/login">Try again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
