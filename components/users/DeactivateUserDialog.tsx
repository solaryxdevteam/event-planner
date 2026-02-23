/**
 * Deactivate User Dialog Component
 *
 * Dialog for confirming user deactivation
 * Global Director only
 */

"use client";

import { useState } from "react";
import * as usersClientService from "@/lib/services/client/users.client.service";
import { ApiError } from "@/lib/services/client/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Database } from "@/lib/types/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess?: () => void;
}

export function DeactivateUserDialog({ open, onOpenChange, user, onSuccess }: DeactivateUserDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await usersClientService.deactivateUser(user.id);
      const fullName = user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
      toast.success(`${fullName} has been deactivated`);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to deactivate user");
      console.error(error);
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Deactivate User</DialogTitle>
              <DialogDescription>Are you sure you want to deactivate this user?</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">
                  {user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium">{user.role.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{user.status}</p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-lg border border-amber-500 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              This action will deactivate the user and prevent them from accessing the system. This action can be
              reversed later by activating the user again.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeactivating}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isDeactivating}
          >
            {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
