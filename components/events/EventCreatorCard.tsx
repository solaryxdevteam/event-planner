"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventCreatorInfo } from "@/lib/hooks/use-users";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCreatorCardProps {
  creatorId: string;
  className?: string;
}

export function EventCreatorCard({ creatorId, className }: EventCreatorCardProps) {
  const { data: profile, isLoading, isError } = useEventCreatorInfo(creatorId);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Avatar className="h-12 w-12 shrink-0">
        {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name} /> : null}
        <AvatarFallback className="text-base">{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium truncate">{profile.name}</p>
        <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
          <a
            href={`mailto:${profile.email}`}
            className="flex items-center gap-2 truncate hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile.email}</span>
          </a>
          {profile.phone ? (
            <a
              href={`tel:${profile.phone}`}
              className="flex items-center gap-2 truncate hover:text-foreground transition-colors"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile.phone}</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
