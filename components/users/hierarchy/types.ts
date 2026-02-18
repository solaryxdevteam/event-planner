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
  marketing_manager: "Marketing Manager",
};

export const roleColors: Record<string, string> = {
  event_planner: "bg-blue-100 text-blue-800 border-blue-300",
  city_curator: "bg-green-100 text-green-800 border-green-300",
  regional_curator: "bg-purple-100 text-purple-800 border-purple-300",
  lead_curator: "bg-orange-100 text-orange-800 border-orange-300",
  global_director: "bg-red-100 text-red-800 border-red-300",
  marketing_manager: "bg-teal-100 text-teal-800 border-teal-300",
};

/** Background for the whole node card (hierarchy flow). Event planner uses default. */
export const roleNodeBg: Record<string, string> = {
  event_planner: "bg-card",
  city_curator: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  regional_curator: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  lead_curator: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  global_director: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  marketing_manager: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800",
};

// Role hierarchy levels (lower number = higher in pyramid)
export const roleRanks: Record<string, number> = {
  global_director: 0,
  lead_curator: 1,
  regional_curator: 2,
  city_curator: 3,
  event_planner: 4,
  marketing_manager: 1, // Same level as lead_curator (reports to GD)
};

// Type for node data in React Flow nodes
export type FlowNodeData = HierarchyNode & {
  roleLabel: string;
  roleColor: string;
  roleNodeBg?: string;
  hasChildren?: boolean;
  hasParent?: boolean;
  onEditUser?: (userId: string) => void;
};
