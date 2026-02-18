"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface DjOption {
  id: string;
  name: string;
  email?: string;
  music_style?: string | null;
}

interface DjComboboxProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  options: DjOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  error?: string;
}

export function DjCombobox({
  value,
  onValueChange,
  options,
  placeholder = "All DJs",
  disabled = false,
  loading = false,
  label,
  error,
}: DjComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find((option) => option.id === value);

  const displayText = selectedOption
    ? selectedOption.music_style
      ? `${selectedOption.name} (${selectedOption.music_style})`
      : selectedOption.name
    : null;

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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or style..." className="h-9" />
            <CommandList className="!max-h-none !overflow-visible p-0">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <CommandGroup>
                      <CommandItem
                        value="__all_djs__"
                        onSelect={() => {
                          onValueChange(null);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">{placeholder}</span>
                      </CommandItem>
                      {safeOptions.map((option) => {
                        const optionText = [option.name, option.email, option.music_style ?? ""]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <CommandItem
                            key={option.id}
                            value={optionText}
                            onSelect={() => {
                              onValueChange(value === option.id ? null : option.id);
                              setOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="truncate">{option.name}</span>
                              {option.music_style && (
                                <span className="text-sm text-muted-foreground">{option.music_style}</span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    <CommandEmpty>No DJs found.</CommandEmpty>
                  </>
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
