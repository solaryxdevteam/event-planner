/**
 * User Actions Component
 *
 * Dropdown menu with actions for each user
 */

"use client";

import { useState } from "react";
import type { Database } from "@/lib/types/database.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, UserX, UserCheck } from "lucide-react";
import { ActivateUserDialog } from "./ActivateUserDialog";
import { DeactivateUserDialog } from "./DeactivateUserDialog";
import { useRouter } from "next/navigation";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UserActionsProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserActions({ user, onEdit }: UserActionsProps) {
  const router = useRouter();
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(user);
    }
  };

  const handleDeactivateSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.status === "active" && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
          )}
          {user.status === "pending" && (
            <DropdownMenuItem onClick={() => setIsActivateDialogOpen(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </DropdownMenuItem>
          )}
          {user.status === "active" && user.is_active && (
            <DropdownMenuItem
              onClick={() => setIsDeactivateDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Activate User Dialog */}
      {user.status === "pending" && (
        <ActivateUserDialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen} user={user} />
      )}

      {/* Deactivate User Dialog */}
      {user.status === "active" && user.is_active && (
        <DeactivateUserDialog
          open={isDeactivateDialogOpen}
          onOpenChange={setIsDeactivateDialogOpen}
          user={user}
          onSuccess={handleDeactivateSuccess}
        />
      )}
    </>
  );
}
