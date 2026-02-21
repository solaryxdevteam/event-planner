/**
 * Invitations Table Component
 *
 * Displays list of invitations with Resend and Delete actions (pending only).
 * Used invitations show status "Invited" and no actions.
 */

"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvitationWithCountry } from "@/lib/data-access/invitations.dal";
import { Mail, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface InvitationsTableProps {
  invitations: InvitationWithCountry[];
  isLoading?: boolean;
  onResend: (invitationId: string) => Promise<void>;
  onDelete: (invitationId: string) => Promise<void>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvitationsTable({ invitations, isLoading = false, onResend, onDelete }: InvitationsTableProps) {
  const [resendId, setResendId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleResend = async (id: string) => {
    setResendId(id);
  };
  const confirmResend = async () => {
    if (!resendId) return;
    setActionLoading(true);
    try {
      await onResend(resendId);
      setResendId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };
  const confirmDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No invitations yet. Create an invitation from the button above.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => {
              const isPending = !inv.used_at;
              const isExpired = new Date(inv.expires_at) < new Date() && isPending;
              const status = inv.used_at ? "Invited" : isExpired ? "Expired" : "Pending";
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>{inv.country_name ?? inv.country_id}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.expires_at)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.used_at ? "default" : isExpired ? "destructive" : "secondary"}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isPending && !isExpired ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(inv.id)}
                          disabled={actionLoading}
                        >
                          <Mail className="mr-1 h-4 w-4" />
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(inv.id)}
                          disabled={actionLoading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!resendId} onOpenChange={(open) => !open && setResendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invitation</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current invitation link and send a new invitation email to the same address.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResend} disabled={actionLoading}>
              {actionLoading ? "Sending…" : "Resend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invitation</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the invitation. The invitee will no longer be able to use this link. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
