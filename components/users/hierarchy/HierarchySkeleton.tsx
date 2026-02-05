/**
 * Hierarchy Skeleton Component
 *
 * Loading skeleton for hierarchy tree visualization
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HierarchySkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="h-[600px] w-full p-8">
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          {/* Simulated hierarchy nodes */}
          <div className="flex flex-col items-center space-y-4">
            {/* Top level node */}
            <Skeleton className="h-24 w-48 rounded-lg" />
            {/* Middle level nodes */}
            <div className="flex gap-4">
              <Skeleton className="h-20 w-40 rounded-lg" />
              <Skeleton className="h-20 w-40 rounded-lg" />
              <Skeleton className="h-20 w-40 rounded-lg" />
            </div>
            {/* Bottom level nodes */}
            <div className="flex gap-3">
              <Skeleton className="h-16 w-32 rounded-lg" />
              <Skeleton className="h-16 w-32 rounded-lg" />
              <Skeleton className="h-16 w-32 rounded-lg" />
              <Skeleton className="h-16 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
