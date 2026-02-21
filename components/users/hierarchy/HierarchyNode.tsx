/**
 * Hierarchy Node Component
 *
 * Custom React Flow node component for displaying user hierarchy nodes
 */

"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import type { HierarchyNode } from "@/lib/hooks/use-user-hierarchy";
import { HierarchyNodeActions } from "./HierarchyNodeActions";

interface HierarchyNodeProps {
  data: HierarchyNode & {
    roleLabel: string;
    roleColor: string;
    roleNodeBg?: string;
    hasChildren?: boolean;
    hasParent?: boolean;
    onEditUser?: (userId: string) => void;
  };
}

export const HierarchyNodeComponent = memo(function HierarchyNodeComponent({ data }: HierarchyNodeProps) {
  const isGlobalDirector = data.role === "global_director";

  const nodeBg = data.roleNodeBg ?? "bg-card";

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 text-card-foreground w-[220px] min-w-[220px] max-w-[220px] relative ${nodeBg}`}
    >
      {/* Top handle (target) - to receive connections from parent above */}
      {data.hasParent && <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />}

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate text-foreground">{data.name}</div>
          <div className="text-xs text-muted-foreground truncate mt-1">{data.email}</div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <Badge variant="outline" className={`text-xs ${data.roleColor}`}>
              {data.roleLabel}
            </Badge>
            {/* Action buttons - exclude global director */}
            {!isGlobalDirector && data.onEditUser && <HierarchyNodeActions node={data} onEditUser={data.onEditUser} />}
          </div>
        </div>
      </div>

      {/* Bottom handle (source) - to connect to children below */}
      {data.hasChildren && <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />}
    </div>
  );
});
