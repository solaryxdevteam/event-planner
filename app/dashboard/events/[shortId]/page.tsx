"use client";

export const dynamic = "force-dynamic";

import { use } from "react";
import { EventDetailClient } from "@/components/events/EventDetailClient";
import { useEventByShortId } from "@/lib/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";

interface EventDetailPageProps {
  params: Promise<{ shortId: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = use(params);
  const shortId = resolvedParams.shortId;

  // Fetch event using React Query (cached)
  const { data: event, isLoading, error } = useEventByShortId(shortId);

  if (isLoading) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive text-lg font-semibold mb-2">Event not found</p>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "The event you're looking for doesn't exist or you don't have permission to view it."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <EventDetailClient event={event} />;
}
