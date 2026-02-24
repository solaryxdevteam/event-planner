"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions, ChartData } from "chart.js";
import { Card } from "@/components/ui/card";

interface ReportsRevenueTrendCardProps {
  lineChartData: ChartData<"bar"> | null;
  lineChartOptions: ChartOptions<"bar">;
}

const CHART_HEIGHT = 220;

export function ReportsRevenueTrendCard({ lineChartData, lineChartOptions }: ReportsRevenueTrendCardProps) {
  const hasData = lineChartData && (lineChartData.labels?.length ?? 0) > 0;
  const currentYear = new Date().getFullYear();

  return (
    <Card className="rounded-lg border bg-card p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Revenue {currentYear}</h3>
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
