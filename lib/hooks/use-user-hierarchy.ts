/**
 * React Query hook for User Hierarchy API
 *
 * Uses client services to make API calls
 */

import { useQuery } from "@tanstack/react-query";
import * as hierarchyClientService from "@/lib/services/client/user-hierarchy.client.service";

// Re-export types from client service
export type { HierarchyNode } from "@/lib/services/client/user-hierarchy.client.service";

/**
 * React Query hook: Get user hierarchy
 */
export function useUserHierarchy() {
  return useQuery({
    queryKey: ["users", "hierarchy"],
    queryFn: hierarchyClientService.fetchHierarchy,
  });
}
