/**
 * User Hierarchy Client Service
 *
 * Client-side service for user hierarchy operations
 * Makes API calls to /api/users/hierarchy endpoint via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";

/**
 * Hierarchy node type
 */
export interface HierarchyNode {
  id: string;
  name: string;
  email: string;
  role: string;
  children: HierarchyNode[];
}

/**
 * Fetch user hierarchy
 */
export async function fetchHierarchy(): Promise<HierarchyNode[]> {
  return apiClient.get<HierarchyNode[]>("/api/users/hierarchy");
}
