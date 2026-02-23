"use client";

import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "./utils";
import type { ReportsInsights } from "./utils";

interface ReportsInsightsCardProps {
  insights: ReportsInsights;
}

export function ReportsInsightsCard({ insights }: ReportsInsightsCardProps) {
  const growthClass = insights.growthPct >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive";
  const growthText =
    insights.growthPct >= 0 ? `+${insights.growthPct.toFixed(1)}%` : `${insights.growthPct.toFixed(1)}%`;

  return (
    <Card className="rounded-lg border bg-card p-4 shadow-none">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Insights
      </h3>
      <ul className="space-y-4 text-sm text-muted-foreground">
        {insights.bestMonth && (
          <li className="flex items-center justify-between">
            <span className="text-foreground">Best month:</span> {insights.bestMonth.label} (
            {formatCurrency(insights.bestMonth.total)})
          </li>
        )}
        {insights.worstMonth && (
          <li className="flex items-center justify-between">
            <span className="text-foreground">Worst month:</span> {insights.worstMonth.label} (
            {formatCurrency(insights.worstMonth.total)})
          </li>
        )}
        <li className="flex items-center justify-between">
          <span className="text-foreground">Top category:</span> {insights.topCategory} (
          {insights.topCategoryPct.toFixed(0)}%)
        </li>
        <li className={`flex items-center justify-between ${growthClass}`}>
          <span className="text-foreground">Growth:</span> {growthText} avg
        </li>
        <li className="flex items-center justify-between">
          <span className="text-foreground">Attendance:</span> {insights.attendance.toLocaleString()} total
        </li>
        <li className="flex items-center justify-between">
          <span className="text-foreground">Revenue/Guest:</span> {formatCurrency(insights.revenuePerGuest)}
        </li>
      </ul>
    </Card>
  );
}
