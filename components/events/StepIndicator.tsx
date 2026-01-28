"use client";

import { CheckCircle2, ChevronRight, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  stepErrors?: Record<number, boolean>;
  steps?: Step[];
}

const defaultSteps: Step[] = [
  { number: 1, title: "Event Details", subtitle: "Basic Information", icon: FileText },
  { number: 2, title: "Schedule & Description", subtitle: "Date, Time & Budget", icon: Calendar },
];

export function StepIndicator({
  currentStep,
  totalSteps,
  onStepClick,
  stepErrors,
  steps = defaultSteps,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const hasError = stepErrors?.[step.number] || false;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onStepClick?.(step.number)}
              disabled={!isActive && !isCompleted}
              className={cn(
                "flex items-center gap-3 flex-1 cursor-pointer rounded-lg p-3 transition-all hover:bg-muted/50",
                hasError && "bg-destructive/10",
                !isActive && !isCompleted && "cursor-not-allowed opacity-70"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCompleted
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="text-left min-w-0">
                <div
                  className={cn(
                    "text-sm font-semibold truncate",
                    hasError
                      ? "text-destructive"
                      : isActive
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{step.subtitle}</div>
              </div>
            </button>
            {!isLast && (
              <ChevronRight
                className={cn("mx-4 h-5 w-5 flex-shrink-0", isCompleted ? "text-primary" : "text-muted-foreground")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
