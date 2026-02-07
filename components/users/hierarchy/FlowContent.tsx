/**
 * Flow Content Component
 *
 * Inner component that uses React Flow hooks (must be inside ReactFlowProvider)
 */

"use client";

import { useCallback, useEffect, memo, useMemo } from "react";
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
  type ColorMode,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { nodeTypes } from "./node-types";

interface FlowContentProps {
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
}

export const FlowContent = memo(function FlowContent({ layoutedNodes, layoutedEdges }: FlowContentProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const { fitView } = useReactFlow();
  const { theme, resolvedTheme } = useTheme();

  // Convert theme to React Flow's ColorMode
  const colorMode: ColorMode = useMemo(() => {
    const currentTheme = resolvedTheme || theme;
    if (currentTheme === "dark") return "dark";
    if (currentTheme === "light") return "light";
    return "system";
  }, [theme, resolvedTheme]);

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
      colorMode={colorMode}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap className="bg-background" />
    </ReactFlow>
  );
});
