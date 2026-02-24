"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, DollarSign, TrendingUp, Award } from "lucide-react";
import { formatCurrency, type ReportsPageSummary } from "./reports-page-utils";

interface ReportsPageKPIRowProps {
  summary: ReportsPageSummary;
  isLoading: boolean;
}

function formatGrowthSub(pct: number): string {
  if (pct > 0) return `↑${pct.toFixed(1)}% vs same period last year`;
  if (pct < 0) return `↓${Math.abs(pct).toFixed(1)}% vs same period last year`;
  return "0% vs same period last year";
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const subClass = sub.startsWith("↑")
    ? "text-green-600 dark:text-green-400"
    : sub.startsWith("↓")
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <Card className="shadow-sm gap-2 p-0 py-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-bold">{value}</p>
        {sub !== "" && <p className={`text-xs mt-1 ${subClass}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ReportsPageKPIRow({ summary, isLoading }: ReportsPageKPIRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-none gap-2">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Total Revenue"
        value={formatCurrency(summary.totalSales)}
        sub={formatGrowthSub(summary.growthPct)}
        icon={DollarSign}
      />
      <KPICard
        label="Total Events"
        value={summary.totalEvents.toLocaleString()}
        sub={formatGrowthSub(summary.eventsGrowthPct)}
        icon={CalendarDays}
      />
      <KPICard
        label="Avg Revenue per Event"
        value={summary.avgSalesPerEvent != null ? formatCurrency(summary.avgSalesPerEvent) : "—"}
        sub={formatGrowthSub(summary.avgRevenueGrowthPct)}
        icon={TrendingUp}
      />
      <KPICard
        label="Best Month"
        value={summary.bestMonth ? `${summary.bestMonth.label} - ${formatCurrency(summary.bestMonth.total)}` : "—"}
        sub={formatGrowthSub(summary.bestMonthGrowthPct)}
        icon={Award}
      />
    </div>
  );
}
