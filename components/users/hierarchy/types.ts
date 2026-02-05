/**
 * Types and Constants for Hierarchy Components
 */

import type { HierarchyNode } from "@/lib/hooks/use-user-hierarchy";

export const roleLabels: Record<string, string> = {
  event_planner: "Event Planner",
  city_curator: "City Curator",
  regional_curator: "Regional Curator",
  lead_curator: "Lead Curator",
  global_director: "Global Director",
};

export const roleColors: Record<string, string> = {
  event_planner: "bg-blue-100 text-blue-800 border-blue-300",
  city_curator: "bg-green-100 text-green-800 border-green-300",
  regional_curator: "bg-purple-100 text-purple-800 border-purple-300",
  lead_curator: "bg-orange-100 text-orange-800 border-orange-300",
  global_director: "bg-red-100 text-red-800 border-red-300",
};

// Role hierarchy levels (lower number = higher in pyramid)
export const roleRanks: Record<string, number> = {
  global_director: 0,
  lead_curator: 1,
  regional_curator: 2,
  city_curator: 3,
  event_planner: 4,
};

// Type for node data in React Flow nodes
export type FlowNodeData = HierarchyNode & {
  roleLabel: string;
  roleColor: string;
  hasChildren?: boolean;
  hasParent?: boolean;
  onEditUser?: (userId: string) => void;
};
