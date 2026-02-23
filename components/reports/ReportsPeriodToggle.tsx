"use client";

import { Button } from "@/components/ui/button";

export type ReportsPeriod = "daily" | "weekly" | "monthly";

interface ReportsPeriodToggleProps {
  value: ReportsPeriod;
  onChange: (value: ReportsPeriod) => void;
}

const LABELS: Record<ReportsPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function ReportsPeriodToggle({ value, onChange }: ReportsPeriodToggleProps) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {(["daily", "weekly", "monthly"] as const).map((p) => (
        <Button
          key={p}
          variant={value === p ? "secondary" : "ghost"}
          size="sm"
          className="rounded-none border-0 h-8 px-3 text-xs"
          onClick={() => onChange(p)}
        >
          {LABELS[p]}
        </Button>
      ))}
    </div>
  );
}
