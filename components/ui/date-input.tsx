"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function DateInput({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  label,
  error,
  disabled = false,
  className,
}: DateInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Focus calendar when popover opens
  React.useEffect(() => {
    if (isOpen && calendarRef.current) {
      // Small delay to ensure calendar is rendered
      setTimeout(() => {
        // Try to focus selected date first, then fallback to first available date
        const selectedButton = calendarRef.current?.querySelector(
          'button[data-day][data-selected-single="true"]:not([disabled])'
        ) as HTMLButtonElement;
        const firstButton = calendarRef.current?.querySelector("button[data-day]:not([disabled])") as HTMLButtonElement;
        (selectedButton || firstButton)?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleCalendarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Escape key to close popover
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    // Handle Enter key to select focused date
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      // Check if we're on a day button
      if (target.tagName === "BUTTON" && target.hasAttribute("data-day")) {
        const dayString = target.getAttribute("data-day");
        if (dayString) {
          try {
            // Parse the date string (format depends on locale, try common formats)
            const date = new Date(dayString);
            if (!isNaN(date.getTime()) && !target.hasAttribute("disabled")) {
              e.preventDefault();
              handleCalendarSelect(date);
            }
          } catch {
            // If parsing fails, let the default button behavior handle it
          }
        }
      }
    }
  };

  const isDateDisabled = (date: Date) => {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={!!error}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "MM/dd/yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" onKeyDown={handleCalendarKeyDown}>
          <div ref={calendarRef}>
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              disabled={isDateDisabled}
              initialFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
