"use client";

export const dynamic = "force-dynamic";

import { use } from "react";
import Link from "next/link";
import { EventDetailClient } from "@/components/events/EventDetailClient";
import { useEventByShortId } from "@/lib/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ shortId: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = use(params);
  const shortId = resolvedParams.shortId;

  const { data: event, isLoading, error } = useEventByShortId(shortId);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
        {/* Header skeleton */}
        <div className="flex items-start gap-2 sm:gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-64 sm:w-80" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Content grid skeleton */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-48 w-full rounded-md" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <p className="text-destructive text-lg font-semibold mb-2">Event not found</p>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error
                ? error.message
                : "The event you're looking for doesn't exist or you don't have permission to view it."}
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/events" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go back to events
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <EventDetailClient event={event} />;
}
