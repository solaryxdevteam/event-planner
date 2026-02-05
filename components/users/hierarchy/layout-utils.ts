/**
 * Layout Utilities for Hierarchy Tree Flow
 *
 * Functions for converting hierarchy tree to React Flow nodes/edges
 * and calculating node positions using dagre layout algorithm
 */

import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { HierarchyNode } from "@/lib/hooks/use-user-hierarchy";
import { roleLabels, roleColors, roleRanks, type FlowNodeData } from "./types";

/**
 * Convert tree structure to nodes and edges
 */
export function convertTreeToFlowData(
  tree: HierarchyNode[],
  onEditUser?: (userId: string) => void
): { nodes: Node[]; edges: Edge[] } {
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
        onEditUser,
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

/**
 * Center parent nodes above their children
 * Uses node centers (position + width/2) for accurate centering
 */
function centerParentNodes(nodes: Node[], edges: Edge[]): Node[] {
  const NODE_WIDTH = 220;

  // Build children map
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  // Create a map for quick node lookup
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Process nodes from bottom to top (children first, then parents)
  // Sort nodes by Y position (bottom to top)
  const sortedNodes = [...nodes].sort((a, b) => b.position.y - a.position.y);

  sortedNodes.forEach((node) => {
    const children = childrenMap.get(node.id) || [];
    if (children.length > 0) {
      // Get all child nodes
      const childNodes = children
        .map((childId) => nodeMap.get(childId))
        .filter((child): child is Node => child !== undefined);

      if (childNodes.length > 0) {
        // Calculate the center X position of all children (using their actual centers)
        const childCenters = childNodes.map((child) => child.position.x + NODE_WIDTH / 2);
        const minChildCenter = Math.min(...childCenters);
        const maxChildCenter = Math.max(...childCenters);
        const centerX = (minChildCenter + maxChildCenter) / 2;

        // Set parent node position so its center aligns with children's center
        // parent.position.x + NODE_WIDTH/2 = centerX
        node.position.x = centerX - NODE_WIDTH / 2;
      }
    }
  });

  return nodes;
}

/**
 * Fallback layout function when dagre fails
 */
export function getFallbackLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;
  const HORIZONTAL_SPACING = 220;
  const VERTICAL_SPACING = 160;

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

  function layoutNode(nodeId: string, level: number, xOffset: number): number {
    const nodeData = nodeDataMap.get(nodeId);
    const role = nodeData?.role || "";
    const roleRank = roleRanks[role] !== undefined ? roleRanks[role] : 999;

    // Use role rank for Y position
    const y = roleRank * VERTICAL_SPACING + 50;

    const children = childrenMap.get(nodeId) || [];
    let currentX = xOffset;

    // Layout children first (left to right)
    // Store child center positions for centering parent
    const childCenters: number[] = [];
    children.forEach((childId) => {
      const childX = layoutNode(childId, level + 1, currentX);
      // Child center is at childX (which is the center point)
      childCenters.push(childX);
      currentX = childX + HORIZONTAL_SPACING;
    });

    // Position current node - center it above its children
    let nodeCenterX: number;
    if (children.length > 0) {
      // Center parent above children
      const minChildCenter = Math.min(...childCenters);
      const maxChildCenter = Math.max(...childCenters);
      nodeCenterX = (minChildCenter + maxChildCenter) / 2;
    } else {
      // Leaf node, use the offset as center
      nodeCenterX = xOffset;
    }

    // Store center point (not top-left position)
    positions.set(nodeId, { x: nodeCenterX, y });

    return currentX;
  }

  // Layout all root nodes
  let rootXOffset = 0;
  rootNodes.forEach((rootNode) => {
    rootXOffset = layoutNode(rootNode.id, 0, rootXOffset);
    rootXOffset += HORIZONTAL_SPACING;
  });

  // Second pass: Center parent nodes above their children
  // Process nodes from bottom to top (children first, then parents)
  const sortedByY = Array.from(positions.entries()).sort((a, b) => b[1].y - a[1].y);

  sortedByY.forEach(([nodeId, pos]) => {
    const children = childrenMap.get(nodeId) || [];
    if (children.length > 0) {
      // Get all child positions (these are center points)
      const childPositions = children
        .map((childId) => positions.get(childId))
        .filter((p): p is { x: number; y: number } => p !== undefined);

      if (childPositions.length > 0) {
        // Calculate the center X position of all children (using their actual centers)
        const childCenters = childPositions.map((p) => p.x);
        const minChildCenter = Math.min(...childCenters);
        const maxChildCenter = Math.max(...childCenters);
        const centerX = (minChildCenter + maxChildCenter) / 2;

        // Center the parent node above its children (store as center point)
        pos.x = centerX;
      }
    }
  });

  // Center all nodes horizontally around the center of the entire tree
  // Positions are stored as center points, so we calculate offset based on centers
  const allXCenters = Array.from(positions.values()).map((p) => p.x);
  const minCenterX = Math.min(...allXCenters);
  const maxCenterX = Math.max(...allXCenters);
  const centerOffset = -(minCenterX + maxCenterX) / 2;

  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    // pos.x is the center point, convert to top-left position
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

/**
 * Layout nodes using dagre with role-based constraints and proper spacing
 */
export async function getLayoutedElements(nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[]; edges: Edge[] }> {
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

    // Spacing configuration for node layout
    dagreGraph.setGraph({
      rankdir: "TB",
      nodesep: 200,
      ranksep: 280,
      edgesep: 50,
      ranker: "network-simplex",
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

    // Post-process: Center parent nodes above their children
    const centeredNodes = centerParentNodes(layoutedNodes, edges);

    return { nodes: centeredNodes, edges };
  } catch {
    return getFallbackLayout(nodes, edges);
  }
}
