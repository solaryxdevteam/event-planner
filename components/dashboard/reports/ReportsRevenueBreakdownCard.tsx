"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions, ChartData } from "chart.js";
import { Card } from "@/components/ui/card";
import { REPORT_CHART_TEXT } from "@/lib/constants/report-chart-colors";
import { formatCurrency } from "./utils";

interface ReportsRevenueBreakdownCardProps {
  donutData: ChartData<"doughnut"> | null;
  donutOptions: ChartOptions<"doughnut">;
  totalSales: number;
}

const DONUT_HEIGHT = 220;

export function ReportsRevenueBreakdownCard({ donutData, donutOptions, totalSales }: ReportsRevenueBreakdownCardProps) {
  return (
    <Card className="rounded-lg border bg-card p-4 shadow-none !gap-4 col-span-2">
      <h3 className="text-sm font-semibold">Revenue Breakdown</h3>
      {donutData ? (
        <div className="relative" style={{ height: DONUT_HEIGHT }}>
          <Chart type="doughnut" data={donutData} options={donutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-bold text-xl" style={{ color: REPORT_CHART_TEXT }}>
              {formatCurrency(totalSales)}
            </span>
            <span className="text-xs text-muted-foreground">Total Revenue</span>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height: DONUT_HEIGHT }}
        >
          No data
        </div>
      )}
    </Card>
  );
}
