"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

import { cn } from "@/lib/utils";

const requirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[a-z]/, text: "At least 1 lowercase letter" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[0-9]/, text: "At least 1 number" },
  {
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/,
    text: "At least 1 special character",
  },
];

interface InputPasswordStrengthProps {
  value?: string;
  onChange?: (value: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  error?: string;
}

export function InputPasswordStrength({
  value = "",
  onChange,
  id,
  label = "Password",
  placeholder = "Password",
  error,
}: InputPasswordStrengthProps) {
  const [password, setPassword] = useState(value);
  const [isVisible, setIsVisible] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const inputId = useId();
  const finalId = id || inputId;

  // Sync password state with value prop
  useEffect(() => {
    setPassword(value);
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPassword(newValue);
    onChange?.(newValue);
    // Open popover when user starts typing
    if (newValue.length > 0) {
      setIsPopoverOpen(true);
    } else {
      setIsPopoverOpen(false);
    }
  };

  const handleFocus = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    // Open popover if there's a password
    if (password.length > 0) {
      setIsPopoverOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay closing to allow popover interactions
    blurTimeoutRef.current = setTimeout(() => {
      // Only close if input is truly not focused and focus didn't move to popover
      const activeElement = document.activeElement;
      const isInputFocused = activeElement === inputRef.current;
      const isPopoverFocused = activeElement?.closest('[data-slot="popover-content"]');

      if (!isInputFocused && !isPopoverFocused) {
        setIsPopoverOpen(false);
      }
    }, 150);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    if (open) {
      setIsPopoverOpen(true);
    } else {
      // Only close if input is not focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement === inputRef.current;

      if (!isInputFocused) {
        setIsPopoverOpen(false);
      }
    }
  };

  const handlePointerDownOutside = (e: Event) => {
    const target = e.target as HTMLElement;
    // Don't close if clicking on the input or its container
    if (inputRef.current?.contains(target) || target === inputRef.current) {
      e.preventDefault();
    }
  };

  const strength = requirements.map((req) => ({
    met: req.regex.test(password),
    text: req.text,
  }));

  const strengthScore = useMemo(() => {
    return strength.filter((req) => req.met).length;
  }, [strength]);

  const getColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-destructive";
    if (score <= 2) return "bg-orange-500 ";
    if (score <= 3) return "bg-amber-500";
    if (score === 4) return "bg-yellow-400";

    return "bg-green-500";
  };

  const getText = (score: number) => {
    if (score === 0) return "Enter a password";
    if (score <= 2) return "Weak password";
    if (score <= 3) return "Medium password";
    if (score === 4) return "Strong password";

    return "Very strong password";
  };

  const strengthColor = getColor(strengthScore);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={finalId}>{label}</Label>
      <Popover open={isPopoverOpen && password.length > 0} onOpenChange={handlePopoverOpenChange} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              id={finalId}
              type={isVisible ? "text" : "password"}
              placeholder={placeholder}
              value={password}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="pr-9"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={toggleVisibility}
              className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
            >
              {isVisible ? <EyeOff /> : <Eye />}
              <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
            </Button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-80"
          align="start"
          side="bottom"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={handlePointerDownOutside}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            // Don't close if interacting with the input
            if (inputRef.current?.contains(target) || target === inputRef.current) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">{getText(strengthScore)}</p>
              <div className="flex h-2 w-full gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-full flex-1 rounded-full transition-all duration-500 ease-out",
                      index < strengthScore ? strengthColor : "bg-border"
                    )}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Must contain:</p>
              <ul className="space-y-1.5">
                {strength.map((req, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {req.met ? (
                      <Check className="size-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <X className="text-muted-foreground size-3.5 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )}
                    >
                      {req.text}
                      <span className="sr-only">{req.met ? " - Requirement met" : " - Requirement not met"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default InputPasswordStrength;
