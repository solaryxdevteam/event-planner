"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";
import { formatCurrency } from "./reports-page-utils";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

ChartJS.register(ArcElement, DoughnutController, Tooltip, Legend);

const DONUT_HEIGHT = 280;

interface ReportsPageRevenueBreakdownProps {
  data: ReportChartDataPoint[] | undefined;
  isLoading: boolean;
}

export function ReportsPageRevenueBreakdown({ data, isLoading }: ReportsPageRevenueBreakdownProps) {
  const colors = useChartColors();

  const { donutData, totalSales } = useMemo(() => {
    const list = data ?? [];
    const totalTicket = list.reduce((s, d) => s + d.ticket_sales, 0);
    const totalBar = list.reduce((s, d) => s + d.bar_sales, 0);
    const totalTable = list.reduce((s, d) => s + d.table_sales, 0);
    const total = totalTicket + totalBar + totalTable;
    if (total === 0) return { donutData: null, totalSales: 0 };
    return {
      donutData: {
        labels: ["Ticket", "Bar", "Table"],
        datasets: [
          {
            data: [totalTicket, totalBar, totalTable],
            backgroundColor: [colors.chart1, colors.chart2, colors.chart3],
            borderWidth: 0,
          },
        ],
      } as ChartData<"doughnut">,
      totalSales: total,
    };
  }, [data, colors.chart1, colors.chart2, colors.chart3]);

  const donutOptions: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.raw as number) / total) * 100 : 0;
              return `${ctx.label}: ${formatCurrency(ctx.raw as number)} (${pct.toFixed(0)}%)`;
            },
          },
        },
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <Card className="p-4 h-full">
        <h3 className="text-sm font-semibold mb-3">Revenue Breakdown</h3>
        <Skeleton className="w-full h-full rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-3">Revenue Breakdown</h3>
      {donutData ? (
        <div className="relative flex-1 min-h-0" style={{ height: DONUT_HEIGHT }}>
          <Chart type="doughnut" data={donutData} options={donutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-bold text-xl">{formatCurrency(totalSales)}</span>
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
