/**
 * Flow Content Component
 *
 * Inner component that uses React Flow hooks (must be inside ReactFlowProvider)
 */

"use client";

import { useCallback, useEffect, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
} from "@xyflow/react";
import type { HierarchyNode } from "@/lib/hooks/use-user-hierarchy";
import { nodeTypes } from "./node-types";

interface FlowContentProps {
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
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

export const FlowContent = memo(function FlowContent({ layoutedNodes, layoutedEdges }: FlowContentProps) {
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
