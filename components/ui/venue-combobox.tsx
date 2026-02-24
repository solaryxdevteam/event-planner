"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface VenueOption {
  id: string;
  name: string;
}

interface VenueComboboxProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  options: VenueOption[];
  placeholder?: string;
  allLabel?: string; // e.g. "All Venues" or "All Creators"; when set, shows a clear option
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  error?: string;
}

export function VenueCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select venue...",
  allLabel = "All venues",
  disabled = false,
  loading = false,
  label,
  error,
}: VenueComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find((option) => option.id === value);
  const displayText = selectedOption ? selectedOption.name : null;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : displayText ? (
              <span className="truncate">{displayText}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search venues..." className="h-9" />
            <CommandList className="!max-h-none !overflow-visible p-0">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : safeOptions.length === 0 ? (
                  <CommandEmpty>No venues found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    <CommandItem
                      value="__all__"
                      onSelect={() => {
                        onValueChange(null);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                      {allLabel}
                    </CommandItem>
                    {safeOptions.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.name}
                        onSelect={() => {
                          onValueChange(value === option.id ? null : option.id);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{option.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
