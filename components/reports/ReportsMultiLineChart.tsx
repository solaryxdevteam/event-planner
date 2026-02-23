"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";
import {
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  formatCurrency,
  type PeriodBucket,
} from "./reports-page-utils";
import { ReportsPeriodToggle, type ReportsPeriod } from "./ReportsPeriodToggle";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

ChartJS.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Title, Tooltip, Legend);

interface ReportsMultiLineChartProps {
  data: ReportChartDataPoint[] | undefined;
  isLoading: boolean;
}

export function ReportsMultiLineChart({ data, isLoading }: ReportsMultiLineChartProps) {
  const [period, setPeriod] = useState<ReportsPeriod>("monthly");
  const colors = useChartColors();

  const trendData = useMemo((): PeriodBucket[] => {
    const daily = data ?? [];
    if (period === "daily") return aggregateByDay(daily);
    if (period === "weekly") return aggregateByWeek(daily);
    return aggregateByMonth(daily);
  }, [data, period]);

  const chartData = useMemo((): ChartData<"line"> | null => {
    if (trendData.length === 0) return null;
    return {
      labels: trendData.map((d) => d.label),
      datasets: [
        {
          label: "Ticket",
          data: trendData.map((d) => d.ticket_sales),
          borderColor: colors.chart1,
          backgroundColor: colors.chart1,
          pointBackgroundColor: colors.chart1,
          pointBorderColor: colors.chart1,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Bar",
          data: trendData.map((d) => d.bar_sales),
          borderColor: colors.chart2,
          backgroundColor: colors.chart2,
          pointBackgroundColor: colors.chart2,
          pointBorderColor: colors.chart2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Table",
          data: trendData.map((d) => d.table_sales),
          borderColor: colors.chart3,
          backgroundColor: colors.chart3,
          pointBackgroundColor: colors.chart3,
          pointBorderColor: colors.chart3,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [trendData, colors]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            afterBody: (context) => {
              if (context.length === 0 || trendData.length === 0) return "";
              const i = context[0].dataIndex;
              const point = trendData[i];
              if (!point) return "";
              const prev = trendData[i - 1];
              const growth =
                prev && prev.total > 0 ? (((point.total - prev.total) / prev.total) * 100).toFixed(0) : null;
              return [
                `Total: ${formatCurrency(point.total)}`,
                `Events: ${point.event_count}`,
                growth != null ? `${Number(growth) >= 0 ? "+" : ""}${growth}% vs prior` : "",
              ]
                .filter(Boolean)
                .join("\n");
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: "hsl(var(--border))" },
          ticks: {
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
      },
    }),
    [trendData]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports – Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports – Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
            No chart data for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Reports – Last 12 Months</CardTitle>
        <ReportsPeriodToggle value={period} onChange={setPeriod} />
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <Chart type="line" data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
