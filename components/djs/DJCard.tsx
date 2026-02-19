"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PencilIcon, TrashIcon, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DJ } from "@/lib/types/database.types";
import { DeleteDjDialog } from "./DeleteDjDialog";
import { DeactivateDjDialog } from "./DeactivateDjDialog";
import { ActivateDjDialog } from "./ActivateDjDialog";
import { UserRole } from "@/lib/types/roles";
import { useDeleteDj, useActivateDj, useDeactivateDj } from "@/lib/hooks/use-djs";

interface DJCardProps {
  dj: DJ;
  userRole: string;
  onDelete: (id: string) => void;
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}

export function DJCard({ dj, userRole, onDelete, onActivate, onDeactivate }: DJCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const deleteMutation = useDeleteDj();
  const activateMutation = useActivateDj();
  const deactivateMutation = useDeactivateDj();
  const isGlobalDirector = userRole === UserRole.GLOBAL_DIRECTOR;
  const isDeleted = !!dj.deleted_at;

  const isActionPending =
    (deleteDialogOpen && deleteMutation.isPending) ||
    (activateDialogOpen && activateMutation.isPending) ||
    (deactivateDialogOpen && deactivateMutation.isPending);

  // const priceFormatted =
  //   dj.price != null
  //     ? new Intl.NumberFormat("en-US", {
  //         style: "currency",
  //         currency: "USD",
  //         minimumFractionDigits: 0,
  //         maximumFractionDigits: 2,
  //       }).format(Number(dj.price))
  //     : null;

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0 gap-6 relative">
      {isActionPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <span className="text-sm font-medium text-muted-foreground">
              {deleteMutation.isPending
                ? "Deleting..."
                : activateMutation.isPending
                  ? "Activating..."
                  : "Deactivating..."}
            </span>
          </div>
        </div>
      )}
      <div className="relative flex h-48 shrink-0 items-center justify-center bg-muted overflow-hidden">
        {dj.picture_url ? (
          <Image
            src={dj.picture_url}
            alt={dj.name}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 400px) 100vw, 340px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <span className="text-sm">No photo</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {isDeleted ? (
            <Badge variant="destructive" className="rounded-sm text-xs">
              Deleted
            </Badge>
          ) : !dj.is_active ? (
            <Badge variant="secondary" className="rounded-sm text-xs">
              Inactive
            </Badge>
          ) : (
            <Badge variant="white" className="rounded-sm text-xs text-gray-900 dark:text-gray-900">
              Active
            </Badge>
          )}
          {dj.email_verified && (
            <Badge variant="secondary" className="rounded-sm text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="px-3">
        <CardTitle className="line-clamp-2">{dj.name}</CardTitle>
        <CardDescription className="flex flex-col gap-1">
          {dj.music_style && (
            <Badge variant="outline" className="rounded-sm w-fit">
              {dj.music_style}
            </Badge>
          )}
          {dj.email && <span className="text-xs text-muted-foreground truncate">{dj.email}</span>}
        </CardDescription>
      </CardHeader>

      {/* <CardContent className="space-y-1 px-3"> */}
      {/* {priceFormatted && (
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium text-muted-foreground">Price</span>
            <p className="text-sm font-medium">{priceFormatted}</p>
          </div>
        )} */}
      {/* <div className="flex flex-wrap gap-1">
          {Array.isArray(dj.technical_rider) && dj.technical_rider.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Tech rider
            </Badge>
          )}
          {Array.isArray(dj.hospitality_rider) && dj.hospitality_rider.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Hospitality rider
            </Badge>
          )}
        </div> */}
      {/* </CardContent> */}

      <CardFooter className="flex flex-wrap gap-2 px-3 pb-3">
        {isGlobalDirector && !isDeleted && onDeactivate && dj.is_active && (
          <Button size="sm" variant="outline" onClick={() => setDeactivateDialogOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        )}
        {isGlobalDirector && !isDeleted && onActivate && !dj.is_active && (
          <Button size="sm" variant="default" onClick={() => setActivateDialogOpen(true)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Activate
          </Button>
        )}
        {isGlobalDirector && !isDeleted && (
          <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
        {!isDeleted && (
          <Button asChild size="sm" variant={isGlobalDirector ? "default" : "outline"} className="flex-1">
            <Link href={`/dashboard/djs/${dj.short_id}/edit`}>
              {isGlobalDirector ? (
                <>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  View more
                </>
              )}
            </Link>
          </Button>
        )}
      </CardFooter>

      <DeleteDjDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        dj={dj}
        onSuccess={() => {
          onDelete(dj.short_id);
        }}
      />

      <DeactivateDjDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        dj={dj}
        onSuccess={() => {}}
      />

      <ActivateDjDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen} dj={dj} onSuccess={() => {}} />
    </Card>
  );
}
