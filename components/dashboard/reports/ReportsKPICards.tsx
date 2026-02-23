"use client";

import { formatCurrency } from "./utils";
import type { ReportsSummary, ReportsInsights } from "./utils";

interface ReportsKPICardsProps {
  summary: ReportsSummary;
  insights: ReportsInsights;
}

function KPICard({ label, value, sub }: { label: string; value: string; sub: string }) {
  const subClass = sub.startsWith("↑")
    ? "text-green-600 dark:text-green-400"
    : sub.startsWith("↓")
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-lg sm:text-xl">{value}</p>
      {sub !== "" && <p className={`text-xs mt-1 ${subClass}`}>{sub}</p>}
    </div>
  );
}

function formatGrowthSub(pct: number): string {
  if (pct > 0) return `↑ ${pct.toFixed(1)}% vs prior`;
  if (pct < 0) return `↓ ${Math.abs(pct).toFixed(1)}% vs prior`;
  return "0% vs prior";
}

export function ReportsKPICards({ summary, insights }: ReportsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
      <KPICard
        label="Total Revenue"
        value={formatCurrency(summary.totalSales)}
        sub={formatGrowthSub(insights.growthPct)}
      />
      <KPICard label="Total Events" value={`${summary.totalEvents}`} sub={formatGrowthSub(insights.eventsGrowthPct)} />
      <KPICard
        label="Avg Revenue per Event"
        value={formatCurrency(summary.avgPerEvent)}
        sub={formatGrowthSub(insights.avgRevenueGrowthPct)}
      />
    </div>
  );
}
