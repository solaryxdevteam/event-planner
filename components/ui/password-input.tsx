"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  label?: string;
  error?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const inputId = React.useId();
    const finalId = id || inputId;

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={finalId}>{label}</Label>}
        <div className="relative">
          <Input
            id={finalId}
            ref={ref}
            type={isVisible ? "text" : "password"}
            className={cn("pr-9", error && "border-destructive", className)}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
