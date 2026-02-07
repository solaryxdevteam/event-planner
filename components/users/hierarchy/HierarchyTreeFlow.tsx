/**
 * Hierarchy Tree Flow Component
 *
 * Main component that displays the user hierarchy in a pyramid/flow visualization using React Flow
 * Uses React Query (useUserHierarchy) for cached GET /api/users/hierarchy
 */

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ReactFlowProvider, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useUserHierarchy } from "@/lib/hooks/use-user-hierarchy";
import { convertTreeToFlowData, getLayoutedElements } from "./layout-utils";
import { FlowContent } from "./FlowContent";
import { HierarchySkeleton } from "./HierarchySkeleton";

interface HierarchyTreeFlowProps {
  isActive?: boolean;
  onEditUser?: (userId: string) => void;
}

export function HierarchyTreeFlow({ isActive = true, onEditUser }: HierarchyTreeFlowProps) {
  const { data: tree = [], isLoading, error: queryError } = useUserHierarchy();
  const error = queryError ? (queryError as Error).message : null;
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);
  const [computedLayoutKey, setComputedLayoutKey] = useState<string>("");
  const previousCurrentLayoutKeyRef = useRef<string>("");

  // Convert tree to flow data (memoized by tree reference)
  // Hooks must be called unconditionally - moved before early returns
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (tree.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertTreeToFlowData(tree, onEditUser);
  }, [tree, onEditUser]);

  // Create a stable key for the current tree + active state to detect when recalculation is needed
  // Include a counter that increments when tab becomes active to force recalculation
  const currentLayoutKey = useMemo(() => {
    if (!isActive || tree.length === 0) {
      return "";
    }
    // Include isActive in the key to ensure recalculation when switching back
    return `${isActive}-${JSON.stringify(tree)}`;
  }, [isActive, tree]);

  // Layout the nodes using dagre (async) - memoized by initialNodes/edges
  // Hooks must be called unconditionally - moved before early returns
  // Only compute layout when active and we have nodes to layout
  const shouldComputeLayout = isActive && initialNodes.length > 0;

  // Derive loading state: we're loading if we should compute but the computed key doesn't match current key
  const isLayouting = shouldComputeLayout && currentLayoutKey !== computedLayoutKey;

  useEffect(() => {
    // Track previous layout key to detect when switching from inactive to active
    const previousKey = previousCurrentLayoutKeyRef.current;
    previousCurrentLayoutKeyRef.current = currentLayoutKey;

    // If tab is inactive, don't compute layout
    if (!shouldComputeLayout) {
      return;
    }

    // Check if we need to recalculate layout
    // Recalculate if:
    // 1. Computed key doesn't match current key, OR
    // 2. We're transitioning from inactive (empty key) to active (non-empty key)
    //    This ensures we always recalculate when switching back to the tab
    const transitioningFromInactive = previousKey === "" && currentLayoutKey !== "";
    const needsLayout = currentLayoutKey !== computedLayoutKey || transitioningFromInactive;

    if (!needsLayout) {
      // Already have layouted data for this tree/state, no need to recalculate
      return;
    }

    // Start layout calculation - only set state in async callbacks
    let cancelled = false;

    getLayoutedElements(initialNodes, initialEdges)
      .then(({ nodes, edges }) => {
        if (!cancelled) {
          setLayoutedNodes(nodes);
          setLayoutedEdges(edges);
          setComputedLayoutKey(currentLayoutKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to original positions if layout fails
          setLayoutedNodes(initialNodes);
          setLayoutedEdges(initialEdges);
          setComputedLayoutKey(currentLayoutKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldComputeLayout, initialNodes, initialEdges, currentLayoutKey, computedLayoutKey]);

  // Derive final nodes/edges to use - empty when we shouldn't compute layout or keys don't match
  // This ensures we don't show stale data when switching tabs
  const finalNodes = useMemo(() => {
    if (!shouldComputeLayout) return [];
    // Only show nodes if the computed key matches current key (prevents showing stale data)
    return currentLayoutKey === computedLayoutKey ? layoutedNodes : [];
  }, [shouldComputeLayout, layoutedNodes, currentLayoutKey, computedLayoutKey]);

  const finalEdges = useMemo(() => {
    if (!shouldComputeLayout) return [];
    // Only show edges if the computed key matches current key (prevents showing stale data)
    return currentLayoutKey === computedLayoutKey ? layoutedEdges : [];
  }, [shouldComputeLayout, layoutedEdges, currentLayoutKey, computedLayoutKey]);

  // Don't initialize React Flow if tab is not active - saves significant resources
  // Only show loading state if we're actively loading, otherwise show placeholder
  if (!isActive) {
    if (isLoading) {
      return <HierarchySkeleton />;
    }
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Switch to Hierarchy tab to view</p>
      </div>
    );
  }

  if (isLoading || isLayouting) {
    return <HierarchySkeleton />;
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

  // Only render React Flow when tab is active and we have layouted data
  const shouldRenderFlow = isActive && finalNodes.length > 0;

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <h3 className="text-lg font-semibold">Organization Hierarchy</h3>
        <p className="text-sm text-muted-foreground mt-1">Visual representation of user hierarchy</p>
      </div>
      <div className="h-[600px] w-full">
        {shouldRenderFlow ? (
          <ReactFlowProvider>
            <FlowContent layoutedNodes={finalNodes} layoutedEdges={finalEdges} />
          </ReactFlowProvider>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Preparing visualization...</p>
          </div>
        )}
      </div>
    </div>
  );
}
