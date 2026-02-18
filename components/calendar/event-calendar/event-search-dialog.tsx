"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EventCard } from "./ui/events";
import { CalendarEvent, TimeFormatType } from "@/lib/calendar/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onEventSelect: (event: CalendarEvent) => void;
  timeFormat: TimeFormatType;
  allEvents?: CalendarEvent[];
}

export const EventSearchDialog = ({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  onEventSelect,
  timeFormat,
  allEvents = [],
}: EventSearchDialogProps) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const filteredResults = useMemo(() => {
    if (localQuery.trim().length < 2) return [];
    const q = localQuery.trim().toLowerCase();
    return allEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    );
  }, [allEvents, localQuery]);

  const handleQueryChange = (value: string) => {
    setLocalQuery(value);
    onSearchQueryChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Search Events</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-hidden">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search events by title, description, or location..."
              value={localQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {localQuery.trim().length >= 2 && (
            <div className="text-muted-foreground text-sm">
              {filteredResults.length > 0
                ? `Found ${filteredResults.length} event${filteredResults.length !== 1 ? "s" : ""}`
                : `No events found matching "${localQuery}"`}
            </div>
          )}
          <ScrollArea className="h-[400px] flex-1">
            {filteredResults.length > 0 ? (
              <div className="space-y-2 pr-4">
                {filteredResults.map((event) => (
                  <EventCard key={event.id} event={event} onClick={onEventSelect} timeFormat={timeFormat} />
                ))}
              </div>
            ) : localQuery.trim().length >= 2 ? (
              <div className="text-muted-foreground py-8 text-center">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No events found matching &quot;{localQuery}&quot;</p>
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Start typing to search events...</p>
                <p className="mt-1 text-xs">Enter at least 2 characters</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
