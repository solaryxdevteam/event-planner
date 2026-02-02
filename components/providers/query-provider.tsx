"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache-on-second-view: keep data fresh so revisiting a page uses cache (no GET, no loading)
            staleTime: 2 * 60 * 1000, // 2 minutes – no refetch on mount while fresh
            gcTime: 5 * 60 * 1000, // 5 minutes – keep unused data in cache
            // Use isLoading for skeleton (no data yet); cached data shows immediately on revisit
            refetchOnMount: true, // refetch when stale; within staleTime = no request
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
