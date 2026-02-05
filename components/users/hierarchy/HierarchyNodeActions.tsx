/**
 * Hierarchy Node Actions Component
 *
 * Dropdown menu with actions for hierarchy nodes (Edit, Deactivate)
 */

"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, UserX } from "lucide-react";
import { DeactivateUserDialog } from "../DeactivateUserDialog";
import type { Database } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import type { HierarchyNode } from "@/lib/hooks/use-user-hierarchy";

interface HierarchyNodeActionsProps {
  node: HierarchyNode;
  onEditUser?: (userId: string) => void;
}

export function HierarchyNodeActions({ node, onEditUser }: HierarchyNodeActionsProps) {
  const router = useRouter();
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  // Create a minimal User object for dialogs (all hierarchy nodes are active users)
  // Note: Some fields are placeholders since HierarchyNode doesn't include all user data
  // The dialog only uses id, name, email, role, and status, so we use type assertion
  const userForDialog = {
    id: node.id,
    email: node.email,
    first_name: node.name.split(" ")[0] || node.name,
    last_name: node.name.split(" ").slice(1).join(" ") || null,
    role: node.role as Database["public"]["Enums"]["role"],
    status: "active" as const,
    is_active: true,
    parent_id: null,
    country_id: "", // Required field, using empty string as placeholder
    state_id: null,
    city: null,
    phone: null,
    company: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notification_prefs: null,
  } as Database["public"]["Tables"]["users"]["Row"];

  const handleEdit = () => {
    if (onEditUser) {
      onEditUser(node.id);
    }
  };

  const handleDeactivateSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="h-6 hover:bg-slate-700">
            <span>Edit</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeactivateDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserX className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate User Dialog */}
      <DeactivateUserDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
        user={userForDialog}
        onSuccess={handleDeactivateSuccess}
      />
    </>
  );
}
