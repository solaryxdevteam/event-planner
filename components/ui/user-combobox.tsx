"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface UserOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: string;
}

interface UserComboboxProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  options: UserOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  error?: string;
}

export function UserCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select user...",
  disabled = false,
  loading = false,
  label,
  error,
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = safeOptions.find((option) => option.id === value);

  const displayText = selectedOption
    ? `${selectedOption.first_name} ${selectedOption.last_name} (${selectedOption.email}) - ${selectedOption.role.replace(/_/g, " ")}`
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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or email..." className="h-9" />
            <CommandList className="!max-h-none !overflow-visible p-0">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : safeOptions.length === 0 ? (
                  <CommandEmpty>No users found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {safeOptions.map((option) => {
                      const optionText = `${option.first_name} ${option.last_name} (${option.role.replace(/_/g, " ")})`;
                      return (
                        <CommandItem
                          key={option.id}
                          value={optionText}
                          onSelect={() => {
                            onValueChange(value === option.id ? null : option.id);
                            setOpen(false);
                          }}
                        >
                          <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="text-sm truncate">{optionText}</span>
                            <span className="text-sm text-muted-foreground">{option.email}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
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
