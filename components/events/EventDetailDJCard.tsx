"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc3 } from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { DJMediaAndRiders } from "./DJMediaAndRiders";

type DJ = NonNullable<EventWithRelations["dj"]>;

interface EventDetailDJCardProps {
  dj: DJ;
}

export function EventDetailDJCard({ dj }: EventDetailDJCardProps) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Disc3 className="h-4 w-4 text-muted-foreground" />
          <div>
            DJ (<span className="font-medium text-foreground">{dj.name}</span>)
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DJMediaAndRiders
          pictureUrl={dj.picture_url ?? null}
          technicalRider={dj.technical_rider}
          hospitalityRider={dj.hospitality_rider}
        />

        {dj.music_style && <p className="text-muted-foreground">Music style: {dj.music_style}</p>}
        {dj.price != null && (
          <p className="text-muted-foreground">
            price: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(dj.price))}
          </p>
        )}
        {dj.email && (
          <a href={`mailto:${dj.email}`} className="text-primary hover:underline block">
            {dj.email}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
