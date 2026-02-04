/**
 * Hierarchy Tree Flow Component
 *
 * Displays the user hierarchy in a pyramid/flow visualization using React Flow
 * Uses React Query (useUserHierarchy) for cached GET /api/users/hierarchy
 */

"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useUserHierarchy, type HierarchyNode } from "@/lib/hooks/use-user-hierarchy";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

const roleLabels: Record<string, string> = {
  event_planner: "Event Planner",
  city_curator: "City Curator",
  regional_curator: "Regional Curator",
  lead_curator: "Lead Curator",
  global_director: "Global Director",
};

const roleColors: Record<string, string> = {
  event_planner: "bg-blue-100 text-blue-800 border-blue-300",
  city_curator: "bg-green-100 text-green-800 border-green-300",
  regional_curator: "bg-purple-100 text-purple-800 border-purple-300",
  lead_curator: "bg-orange-100 text-orange-800 border-orange-300",
  global_director: "bg-red-100 text-red-800 border-red-300",
};

// Role hierarchy levels (lower number = higher in pyramid)
const roleRanks: Record<string, number> = {
  global_director: 0,
  lead_curator: 1,
  regional_curator: 2,
  city_curator: 3,
  event_planner: 4,
};

// Type for node data in React Flow nodes
type FlowNodeData = HierarchyNode & {
  roleLabel: string;
  roleColor: string;
  hasChildren?: boolean;
  hasParent?: boolean;
};

// Custom Node Component with Handles for edge connections
const CustomNode = memo(function CustomNode({
  data,
}: {
  data: HierarchyNode & {
    roleLabel: string;
    roleColor: string;
    hasChildren?: boolean;
    hasParent?: boolean;
  };
}) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 bg-white min-w-[200px] relative">
      {/* Top handle (target) - to receive connections from parent above */}
      {data.hasParent && <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />}

      <div className="flex items-start gap-2">
        <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{data.name}</div>
          <div className="text-xs text-muted-foreground truncate mt-1">{data.email}</div>
          <Badge variant="outline" className={`text-xs mt-2 ${data.roleColor}`}>
            {data.roleLabel}
          </Badge>
        </div>
      </div>

      {/* Bottom handle (source) - to connect to children below */}
      {data.hasChildren && <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />}
    </div>
  );
});

const nodeTypes = {
  custom: CustomNode,
};

// Convert tree structure to nodes and edges (memoized by tree reference)
function convertTreeToFlowData(tree: HierarchyNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 0;
  const nodeIdMap = new Map<HierarchyNode, string>(); // Map original node to flow node ID

  function traverse(node: HierarchyNode, parentId: string | null = null) {
    const nodeId = `node-${nodeIdCounter++}`;
    nodeIdMap.set(node, nodeId);
    const roleLabel = roleLabels[node.role] || node.role;
    const roleColor = roleColors[node.role] || "bg-gray-100 text-gray-800 border-gray-300";
    const hasChildren = node.children.length > 0;
    const hasParent = parentId !== null;

    nodes.push({
      id: nodeId,
      type: "custom",
      data: {
        ...node,
        roleLabel,
        roleColor,
        hasChildren,
        hasParent,
      },
      position: { x: 0, y: 0 }, // Will be calculated by dagre
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        sourceHandle: undefined, // Use default bottom handle
        targetHandle: undefined, // Use default top handle
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2.5,
          stroke: "#64748b",
        },
      });
    }

    node.children.forEach((child) => {
      traverse(child, nodeId);
    });
  }

  tree.forEach((rootNode) => {
    traverse(rootNode);
  });

  return { nodes, edges };
}

// Fallback layout function when dagre fails
function getFallbackLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 450;

  // Create a map of node IDs to their data
  const nodeDataMap = new Map<string, FlowNodeData>();
  nodes.forEach((node) => {
    nodeDataMap.set(node.id, node.data as unknown as FlowNodeData);
  });

  // Build parent-child map
  const parentMap = new Map<string, string>();
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    parentMap.set(edge.target, edge.source);
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  // Find root nodes (nodes without parents)
  const rootNodes = nodes.filter((node) => !parentMap.has(node.id));

  // Calculate positions using a hierarchical layout
  const positions = new Map<string, { x: number; y: number }>();
  let maxX = 0;

  function layoutNode(nodeId: string, level: number, xOffset: number): number {
    const nodeData = nodeDataMap.get(nodeId);
    const role = nodeData?.role || "";
    const roleRank = roleRanks[role] !== undefined ? roleRanks[role] : 999;

    // Use role rank for Y position, but allow some flexibility
    const y = roleRank * VERTICAL_SPACING + 50;

    const children = childrenMap.get(nodeId) || [];
    let currentX = xOffset;

    // Layout children
    children.forEach((childId) => {
      currentX = layoutNode(childId, level + 1, currentX);
      currentX += HORIZONTAL_SPACING;
    });

    // Position current node
    const nodeX = children.length > 0 ? (xOffset + (currentX - HORIZONTAL_SPACING)) / 2 : xOffset;
    positions.set(nodeId, { x: nodeX, y });
    maxX = Math.max(maxX, nodeX);

    return currentX;
  }

  // Layout all root nodes
  let rootXOffset = 0;
  rootNodes.forEach((rootNode) => {
    rootXOffset = layoutNode(rootNode.id, 0, rootXOffset);
    rootXOffset += HORIZONTAL_SPACING;
  });

  // Center all nodes horizontally
  const allXPositions = Array.from(positions.values()).map((p) => p.x);
  const minX = Math.min(...allXPositions);
  const maxXPos = Math.max(...allXPositions);
  const centerOffset = -(minX + maxXPos) / 2;

  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position: {
        x: pos.x + centerOffset - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Layout nodes using dagre with role-based constraints and proper spacing
async function getLayoutedElements(nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    // Dynamically import dagre to avoid CommonJS require issues
    const dagre = (await import("@dagrejs/dagre")).default;
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Create a map of node IDs to their data for quick lookup
    const nodeDataMap = new Map<string, FlowNodeData>();
    nodes.forEach((node) => {
      nodeDataMap.set(node.id, node.data as unknown as FlowNodeData);
    });

    // Increased spacing to prevent edge collisions with nodes
    dagreGraph.setGraph({
      rankdir: "TB",
      nodesep: 320, // Increased horizontal spacing between nodes
      ranksep: 450, // Increased vertical spacing between ranks
      edgesep: 50, // Minimum distance between edges
      ranker: "network-simplex", // Better algorithm for complex hierarchies
    });

    // Add nodes first
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: 220,
        height: 100,
      });
    });

    // Add edges with role-based minimum length to enforce hierarchy
    edges.forEach((edge) => {
      const sourceData = nodeDataMap.get(edge.source);
      const targetData = nodeDataMap.get(edge.target);

      if (!sourceData || !targetData) {
        return;
      }

      const sourceRole = sourceData.role || "";
      const targetRole = targetData.role || "";
      const sourceRank = roleRanks[sourceRole] !== undefined ? roleRanks[sourceRole] : 999;
      const targetRank = roleRanks[targetRole] !== undefined ? roleRanks[targetRole] : 999;

      // Calculate minimum edge length based on role difference
      const minLength = Math.max(1, targetRank - sourceRank);

      try {
        dagreGraph.setEdge(edge.source, edge.target, {
          minlen: minLength,
          weight: 1,
        });
      } catch {
        // Silently handle edge addition errors
      }
    });

    // Run layout
    dagre.layout(dagreGraph);

    // Extract positioned nodes
    const layoutedNodes = nodes
      .map((node) => {
        try {
          const nodeWithPosition = dagreGraph.node(node.id);
          if (!nodeWithPosition || nodeWithPosition.x === undefined || nodeWithPosition.y === undefined) {
            return null;
          }
          return {
            ...node,
            position: {
              x: nodeWithPosition.x - 110, // Center the node (width / 2)
              y: nodeWithPosition.y - 50, // Center the node (height / 2)
            },
          };
        } catch {
          return null;
        }
      })
      .filter((node): node is Node => node !== null);

    // Check if all nodes were positioned
    if (layoutedNodes.length !== nodes.length) {
      return getFallbackLayout(nodes, edges);
    }

    return { nodes: layoutedNodes, edges };
  } catch {
    return getFallbackLayout(nodes, edges);
  }
}

// Memoized node color function for MiniMap
const getNodeColor = (node: Node) => {
  const data = node.data as unknown as HierarchyNode & { roleColor?: string };
  if (data.roleColor?.includes("red")) return "#fecaca";
  if (data.roleColor?.includes("orange")) return "#fed7aa";
  if (data.roleColor?.includes("purple")) return "#e9d5ff";
  if (data.roleColor?.includes("green")) return "#bbf7d0";
  if (data.roleColor?.includes("blue")) return "#bfdbfe";
  return "#e5e7eb";
};

// Inner component that uses React Flow hooks (must be inside ReactFlowProvider)
const FlowContent = memo(function FlowContent({
  layoutedNodes,
  layoutedEdges,
}: {
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const { fitView } = useReactFlow();

  // Update nodes and edges when layouted data changes, then fit view
  useEffect(() => {
    if (layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      // Fit view after a short delay to ensure nodes are rendered
      const timeoutId = setTimeout(() => {
        fitView({ padding: 0.4, duration: 400 });
      }, 150);
      return () => clearTimeout(timeoutId);
    } else {
      // Clear nodes and edges if empty
      setNodes([]);
      setEdges([]);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  const onConnect = useCallback(() => {
    // Prevent manual connections
    return;
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      minZoom={0.1}
      maxZoom={2}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap nodeColor={getNodeColor} className="bg-background" />
    </ReactFlow>
  );
});

interface HierarchyTreeFlowProps {
  isActive?: boolean;
}

export function HierarchyTreeFlow({ isActive = true }: HierarchyTreeFlowProps) {
  const { data: tree = [], isLoading, error: queryError } = useUserHierarchy();
  const error = queryError ? (queryError as Error).message : null;
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);

  // Convert tree to flow data (memoized by tree reference)
  // Hooks must be called unconditionally - moved before early returns
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (tree.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertTreeToFlowData(tree);
  }, [tree]);

  // Layout the nodes using dagre (async) - memoized by initialNodes/edges
  // Hooks must be called unconditionally - moved before early returns
  // Only compute layout when active and we have nodes to layout
  const shouldComputeLayout = isActive && initialNodes.length > 0;

  useEffect(() => {
    if (!shouldComputeLayout) {
      return;
    }

    let cancelled = false;
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setIsLayouting(true);
      }
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
      clearTimeout(timeoutId);
      // Reset loading state when effect is cleaned up
      setIsLayouting(false);
    };
  }, [shouldComputeLayout, initialNodes, initialEdges]);

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
      return (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading hierarchy...</p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Switch to Hierarchy tab to view</p>
      </div>
    );
  }

  if (isLoading || isLayouting) {
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
