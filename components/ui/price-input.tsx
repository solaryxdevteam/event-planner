"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface PriceInputProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// Format price with thousand separators and always show 2 decimal places
// Example: 1000 -> "1,000.00", 1234.5 -> "1,234.50"
// Note: $ symbol is displayed separately as a visual prefix, not in the value
const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2, // Always show 2 decimal places (e.g., "1,000.00")
    maximumFractionDigits: 2, // Maximum 2 decimal places
  }).format(value);
};

// Parse formatted price string to number (removes $ and formatting)
const parsePrice = (value: string): number | undefined => {
  // Remove all non-numeric characters except decimal point (including $ symbol)
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") return undefined;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
};

export function PriceInput({ value, onChange, onBlur, className, ...props }: PriceInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(() => formatPrice(value));
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Update display value when external value changes (but not while user is typing)
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(formatPrice(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;

    // Allow empty input
    if (inputValue === "") {
      setDisplayValue("");
      onChange?.(undefined);
      return;
    }

    // Remove all non-numeric characters except decimal point
    let cleaned = inputValue.replace(/[^\d.]/g, "");

    // Prevent multiple decimal points
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + "." + parts[1].substring(0, 2);
    }

    // Parse the numeric value
    const numValue = parsePrice(cleaned);

    // Always format with decimals (minimumFractionDigits: 2 ensures .00 is shown)
    if (numValue !== undefined) {
      const formatted = formatPrice(numValue);

      // Calculate cursor position after formatting
      // Count digits (including decimal) before cursor in original input
      const textBeforeCursor = inputValue.substring(0, cursorPosition);
      const digitsBeforeCursor = textBeforeCursor.replace(/[^\d.]/g, "").length;

      // Find position in formatted string by counting digits
      let newCursorPos = formatted.length;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d|\./.test(formatted[i])) {
          digitCount++;
          if (digitCount >= digitsBeforeCursor) {
            newCursorPos = i + 1;
            break;
          }
        }
      }

      setDisplayValue(formatted);
      onChange?.(numValue);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const pos = Math.min(newCursorPos, formatted.length);
          inputRef.current.setSelectionRange(pos, pos);
        }
      });
    } else if (cleaned && cleaned !== ".") {
      // If user is typing but not yet a valid number, show raw input
      // This allows typing "1" before it becomes "1.00"
      setDisplayValue(cleaned);
      onChange?.(undefined);
    } else {
      setDisplayValue(cleaned);
      onChange?.(undefined);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Ensure final formatting on blur
    const numValue = parsePrice(e.target.value);
    if (numValue !== undefined) {
      setDisplayValue(formatPrice(numValue));
    } else {
      setDisplayValue("");
    }
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">$</span>
      <Input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("pl-7", className)}
      />
    </div>
  );
}
