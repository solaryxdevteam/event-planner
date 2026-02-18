"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon, CheckIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useDjs } from "@/lib/hooks/use-djs";
import type { DJ } from "@/lib/types/database.types";

interface DJSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDjId: string | null;
  onSelectDj: (dj: DJ | null) => void;
}

export function DJSelectionDialog({ open, onOpenChange, selectedDjId, onSelectDj }: DJSelectionDialogProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const { data: djsData, isLoading } = useDjs({
    search: searchValue || undefined,
    activeOnly: true,
    pageSize: 100,
  });

  const djs = djsData?.data ?? [];

  const handleSelectDj = (dj: DJ) => {
    onSelectDj(dj);
    onOpenChange(false);
  };

  // const handleClearSelection = () => {
  //   onSelectDj(null);
  //   onOpenChange(false);
  // };

  const handleSearchClear = () => {
    setSearchValue("");
  };

  const handleAddNewDj = () => {
    onOpenChange(false);
    router.push("/dashboard/djs/new");
  };

  const priceFormatted = (dj: DJ) =>
    dj.price != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(Number(dj.price))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[95vw] md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select DJ</DialogTitle>
          <DialogDescription>Choose a DJ for your event. A DJ must be assigned to every event.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4">
          <div className="w-full relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, music style, or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={handleSearchClear}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 pb-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading DJs...</p>
            </div>
          ) : djs.length === 0 ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">
                {searchValue ? "No DJs found matching your search" : "No active DJs available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4 pb-4">
              {/* Add new DJ card - first */}
              <Card
                className="cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 py-0"
                onClick={handleAddNewDj}
              >
                <div className="relative flex h-full items-center justify-center bg-muted overflow-hidden">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <PlusIcon className="h-14 w-14" />
                    <span className="text-sm font-medium">Add new DJ</span>
                    <span className="text-xs text-center px-4">Create a new DJ to use for events</span>
                    <span className="text-xs text-center px-4">Click to go to the DJ creation page</span>
                  </div>
                </div>
              </Card>

              {djs.map((dj) => {
                const isSelected = selectedDjId === dj.id;
                const price = priceFormatted(dj);
                return (
                  <Card
                    key={dj.id}
                    className={`cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0 ${
                      isSelected ? "border-primary border-2 bg-primary/5 shadow-md" : ""
                    }`}
                    onClick={() => handleSelectDj(dj)}
                  >
                    <div className="relative flex h-36 items-center justify-center bg-muted overflow-hidden">
                      {dj.picture_url ? (
                        <Image src={dj.picture_url} alt={dj.name} fill className="object-cover" unoptimized />
                      ) : (
                        <span className="text-sm text-muted-foreground">No photo</span>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="default" className="rounded-sm text-xs bg-primary text-primary-foreground">
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2 text-base">{dj.name}</CardTitle>
                      <CardDescription className="flex flex-col gap-1">
                        {dj.music_style && (
                          <Badge variant="outline" className="rounded-sm w-fit text-xs">
                            {dj.music_style}
                          </Badge>
                        )}
                        {price && <span className="text-xs font-medium">{price}</span>}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
