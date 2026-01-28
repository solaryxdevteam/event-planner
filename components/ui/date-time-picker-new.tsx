"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePickerNew({
  value,
  onChange,
  min,
  max,
  label,
  placeholder = "MM/DD/YYYY hh:mm aa",
  error,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      // If we already have a time, preserve it
      if (value) {
        const newDate = new Date(date);
        newDate.setHours(value.getHours());
        newDate.setMinutes(value.getMinutes());
        onChange(newDate);
      } else {
        // Default to current time
        const now = new Date();
        date.setHours(now.getHours());
        date.setMinutes(now.getMinutes());
        onChange(date);
      }
    }
  }

  function handleTimeChange(type: "hour" | "minute" | "ampm", val: string) {
    const currentDate = value || new Date();
    const newDate = new Date(currentDate);

    if (type === "hour") {
      const hour = parseInt(val, 10);
      const isPM = newDate.getHours() >= 12;
      if (isPM) {
        newDate.setHours(hour === 12 ? 12 : hour + 12);
      } else {
        newDate.setHours(hour === 12 ? 0 : hour);
      }
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(val, 10));
    } else if (type === "ampm") {
      const hours = newDate.getHours();
      if (val === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (val === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }

    onChange(newDate);
  }

  const isDateDisabled = (date: Date) => {
    // Reset time to start of day for comparison
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (min) {
      const minDateOnly = new Date(min);
      minDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly < minDateOnly) return true;
    }

    if (max) {
      const maxDateOnly = new Date(max);
      maxDateOnly.setHours(0, 0, 0, 0);
      if (dateOnly > maxDateOnly) return true;
    }

    return false;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={!!error}
          >
            {value ? format(value, "MM/dd/yyyy hh:mm aa") : <span>{placeholder}</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .reverse()
                    .map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        type="button"
                        variant={value && value.getHours() % 12 === hour % 12 ? "default" : "ghost"}
                        className="sm:w-full shrink-0 aspect-square"
                        onClick={() => handleTimeChange("hour", hour.toString())}
                      >
                        {hour}
                      </Button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      type="button"
                      variant={value && value.getMinutes() === minute ? "default" : "ghost"}
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("minute", minute.toString())}
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="">
                <div className="flex sm:flex-col p-2">
                  {["AM", "PM"].map((ampm) => (
                    <Button
                      key={ampm}
                      size="icon"
                      type="button"
                      variant={
                        value && ((ampm === "AM" && value.getHours() < 12) || (ampm === "PM" && value.getHours() >= 12))
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("ampm", ampm)}
                    >
                      {ampm}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
