"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
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

export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date and time",
  label,
  error,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [timeValue, setTimeValue] = React.useState<string>(value ? format(value, "HH:mm") : "");

  // Update local state when value prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setTimeValue(format(value, "HH:mm"));
    } else {
      setSelectedDate(undefined);
      setTimeValue("");
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // If time is already set, combine date and time
      if (timeValue) {
        const [hours, minutes] = timeValue.split(":").map(Number);
        const newDateTime = new Date(date);
        newDateTime.setHours(hours, minutes, 0, 0);
        onChange(newDateTime);
      } else {
        // Just set the date, keep existing time if value exists
        if (value) {
          const newDateTime = new Date(date);
          newDateTime.setHours(value.getHours(), value.getMinutes(), 0, 0);
          onChange(newDateTime);
        } else {
          setSelectedDate(date);
        }
      }
    } else {
      setSelectedDate(undefined);
      onChange(undefined);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setTimeValue(time);

    if (time && selectedDate) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);
      onChange(newDateTime);
    } else if (time && !selectedDate) {
      // Time set but no date - just store the time for now
      // The date will be set when user selects a date
    }
  };

  const handleApply = () => {
    if (selectedDate && timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);
      onChange(newDateTime);
      setIsOpen(false);
    } else if (selectedDate) {
      // Date selected but no time - use current time or default to 00:00
      const newDateTime = new Date(selectedDate);
      if (value) {
        newDateTime.setHours(value.getHours(), value.getMinutes(), 0, 0);
      } else {
        newDateTime.setHours(0, 0, 0, 0);
      }
      onChange(newDateTime);
      setIsOpen(false);
    }
  };

  const displayValue = value ? `${format(value, "MMM d, yyyy")} at ${format(value, "h:mm a")}` : placeholder;

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
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
            />
            <div className="flex items-center gap-2 border-t pt-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input type="time" value={timeValue} onChange={handleTimeChange} className="w-full" placeholder="HH:mm" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(undefined);
                  setTimeValue("");
                  onChange(undefined);
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
              <Button type="button" variant="default" size="sm" onClick={handleApply} disabled={!selectedDate}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
