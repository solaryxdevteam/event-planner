"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, TrashIcon, BanIcon } from "lucide-react";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface VenueActionsProps {
  venue: VenueWithCreator;
  onEdit?: () => void;
  editHref?: string;
  onDelete: () => void;
  onBan?: () => void;
}

export function VenueActions({ venue, onEdit, editHref, onDelete, onBan }: VenueActionsProps) {
  // venue is part of the interface but not currently used in the component
  void venue;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="h-8 w-8">
          <MoreHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editHref ? (
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <TrashIcon className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
        {onBan && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBan} variant="destructive">
              <BanIcon className="mr-2 h-4 w-4" />
              Ban Venue
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
