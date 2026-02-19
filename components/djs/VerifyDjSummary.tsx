"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VerifyDjInfo } from "@/lib/services/djs/dj-contact-verification.service";
import Image from "next/image";

interface VerifyDjSummaryProps {
  dj: VerifyDjInfo;
}

/**
 * Read-only DJ summary for the verify-dj page (same info style as DJCard, no actions).
 */
export function VerifyDjSummary({ dj }: VerifyDjSummaryProps) {
  return (
    <Card className="overflow-hidden shadow-sm pt-0">
      <div className="relative flex h-32 shrink-0 items-center justify-center bg-muted overflow-hidden">
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
      </div>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle className="line-clamp-2">{dj.name}</CardTitle>
          <CardDescription className="flex flex-col gap-2">
            {dj.music_style && (
              <Badge variant="outline" className="rounded-sm w-fit">
                {dj.music_style}
              </Badge>
            )}
            {dj.email && <span className="text-xs text-muted-foreground truncate">{dj.email}</span>}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {dj.short_id && (
          <div className="flex items-center justify-between w-full pt-2 border-t">
            <span className="text-xs text-muted-foreground">DJ ID</span>
            <Badge variant="outline" className="text-xs font-mono">
              {dj.short_id}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
