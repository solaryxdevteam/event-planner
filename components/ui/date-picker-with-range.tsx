"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export interface DatePickerWithRangeProps {
  value: { from: Date | undefined; to: Date | undefined } | undefined;
  onChange: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePickerWithRange({
  value,
  onChange,
  label = "Date Picker Range",
  placeholder = "Pick a date",
  id = "date-picker-range",
  className,
  disabled = false,
}: DatePickerWithRangeProps) {
  const selected: DateRange | undefined = value ? { from: value.from, to: value.to } : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "w-full min-w-0 justify-start overflow-hidden px-2.5 text-left font-normal",
              !value?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={selected}
            onSelect={(range) => onChange(range ? { from: range.from, to: range.to } : undefined)}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
