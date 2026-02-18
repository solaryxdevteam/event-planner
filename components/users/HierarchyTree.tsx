/**
 * Hierarchy Tree Component
 *
 * Displays the user hierarchy in a tree visualization
 * Uses React Query (useUserHierarchy) for cached GET /api/users/hierarchy
 */

"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserHierarchy, type HierarchyNode } from "@/lib/hooks/use-user-hierarchy";

const roleLabels: Record<string, string> = {
  event_planner: "Event Planner",
  city_curator: "City Curator",
  regional_curator: "Regional Curator",
  lead_curator: "Lead Curator",
  global_director: "Global Director",
  marketing_manager: "Marketing Manager",
};

interface TreeNodeProps {
  node: HierarchyNode;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 rounded-md p-2 hover:bg-muted"
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="h-6 w-6" /> // Spacer for alignment
        )}

        <User className="h-4 w-4 text-muted-foreground" />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{node.name}</span>
            <Badge variant="outline" className="text-xs">
              {roleLabels[node.role] || node.role}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{node.email}</p>
        </div>

        {/* Note: Location display will need to fetch location names separately */}
      </div>

      {isExpanded &&
        hasChildren &&
        node.children.map((child) => <TreeNode key={child.id} node={child} level={level + 1} />)}
    </div>
  );
}

export function HierarchyTree() {
  const { data: tree = [], isLoading, error: queryError } = useUserHierarchy();
  const error = queryError ? (queryError as Error).message : null;

  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Loading hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <h3 className="font-semibold text-destructive">Error</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No users found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="p-4">
        <h3 className="mb-4 text-lg font-semibold">Organization Hierarchy</h3>
        <div className="space-y-1">
          {tree.map((node) => (
            <TreeNode key={node.id} node={node} level={0} />
          ))}
        </div>
      </div>
    </div>
  );
}
