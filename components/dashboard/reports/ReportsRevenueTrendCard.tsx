"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions, ChartData } from "chart.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportsRevenueTrendCardProps {
  lineChartData: ChartData<"bar"> | null;
  lineChartOptions: ChartOptions<"bar">;
  period: "monthly" | "weekly" | "daily";
  onPeriodChange: (period: "monthly" | "weekly" | "daily") => void;
}

const CHART_HEIGHT = 220;

export function ReportsRevenueTrendCard({
  lineChartData,
  lineChartOptions,
  period,
  onPeriodChange,
}: ReportsRevenueTrendCardProps) {
  const hasData = lineChartData && (lineChartData.labels?.length ?? 0) > 0;

  return (
    <Card className="rounded-lg border bg-card p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Revenue Trend</h3>
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["monthly", "weekly", "daily"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-8 px-3 text-xs"
              onClick={() => onPeriodChange(p)}
            >
              {p === "monthly" ? "Monthly" : p === "weekly" ? "Weekly" : "Daily"}
            </Button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div className="w-full" style={{ height: CHART_HEIGHT }}>
          <Chart type="bar" data={lineChartData!} options={lineChartOptions} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg"
          style={{ height: CHART_HEIGHT }}
        >
          No trend data for this period.
        </div>
      )}
    </Card>
  );
}
