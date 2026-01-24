"use client";

import { useId, useMemo, useState } from "react";

import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

const requirements = [
  { regex: /.{12,}/, text: "At least 12 characters" },
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

  const inputId = useId();
  const finalId = id || inputId;

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPassword(newValue);
    onChange?.(newValue);
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

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={finalId}>{label}</Label>
      <div className="relative mb-3">
        <Input
          id={finalId}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          value={password}
          onChange={handleChange}
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mb-4 flex h-1 w-full gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-500 ease-out",
              index < strengthScore ? getColor(strengthScore) : "bg-border"
            )}
          />
        ))}
      </div>

      <p className="text-foreground text-sm font-medium">{getText(strengthScore)}. Must contain:</p>

      <ul className="mb-4 space-y-1.5">
        {strength.map((req, index) => (
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <X className="text-muted-foreground size-4" />
            )}
            <span className={cn("text-xs", req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
              {req.text}
              <span className="sr-only">{req.met ? " - Requirement met" : " - Requirement not met"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default InputPasswordStrength;
