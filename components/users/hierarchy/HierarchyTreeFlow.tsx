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
  const [isLayouting, setIsLayouting] = useState(false);
  const previousTreeRef = useRef<typeof tree>([]);
  const previousIsActiveRef = useRef(isActive);

  // Convert tree to flow data (memoized by tree reference)
  // Hooks must be called unconditionally - moved before early returns
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (tree.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertTreeToFlowData(tree, onEditUser);
  }, [tree, onEditUser]);

  // Layout the nodes using dagre (async) - memoized by initialNodes/edges
  // Hooks must be called unconditionally - moved before early returns
  // Only compute layout when active and we have nodes to layout
  const shouldComputeLayout = isActive && initialNodes.length > 0;

  useEffect(() => {
    const wasActive = previousIsActiveRef.current;
    const becameInactive = wasActive && !isActive;
    const becameActive = !wasActive && isActive;

    // Update ref for next render
    previousIsActiveRef.current = isActive;

    // If tab is inactive, don't compute layout
    if (!shouldComputeLayout) {
      // Clear layouted nodes/edges when tab becomes inactive
      // Use setTimeout to avoid synchronous setState in effect
      if (becameInactive) {
        setTimeout(() => {
          setLayoutedNodes([]);
          setLayoutedEdges([]);
          setIsLayouting(false);
        }, 0);
      }
      return;
    }

    // Check if tree data has changed
    const treeChanged = JSON.stringify(tree) !== JSON.stringify(previousTreeRef.current);

    // Need to recalculate if:
    // - Tree data changed
    // - We don't have layouted nodes yet
    // - Tab just became active (to ensure fresh layout)
    const needsLayout = treeChanged || layoutedNodes.length === 0 || becameActive;

    if (!needsLayout && layoutedNodes.length > 0) {
      // Already have layouted data and nothing changed, no need to recalculate
      return;
    }

    // Update tree ref after checking for changes
    if (treeChanged) {
      previousTreeRef.current = tree;
    }

    let cancelled = false;
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setIsLayouting(true);
    }, 0);

    getLayoutedElements(initialNodes, initialEdges)
      .then(({ nodes, edges }) => {
        if (!cancelled) {
          setLayoutedNodes(nodes);
          setLayoutedEdges(edges);
          setIsLayouting(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback to original positions if layout fails
          setLayoutedNodes(initialNodes);
          setLayoutedEdges(initialEdges);
          setIsLayouting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldComputeLayout, initialNodes, initialEdges, isActive, tree, layoutedNodes.length]);

  // Derive final nodes/edges to use - empty when we shouldn't compute layout
  // This avoids synchronous setState in effects
  const finalNodes = useMemo(() => {
    return shouldComputeLayout ? layoutedNodes : [];
  }, [shouldComputeLayout, layoutedNodes]);

  const finalEdges = useMemo(() => {
    return shouldComputeLayout ? layoutedEdges : [];
  }, [shouldComputeLayout, layoutedEdges]);

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
