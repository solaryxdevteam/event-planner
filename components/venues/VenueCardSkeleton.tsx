"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function VenueCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm p-0">
      {/* Image Skeleton */}
      <div className="flex h-60 items-center justify-center bg-muted">
        <Skeleton className="w-full h-full" />
      </div>

      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 mb-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </CardFooter>
    </Card>
  );
}
