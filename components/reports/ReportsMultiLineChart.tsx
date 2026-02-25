"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
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
  aggregateByYear,
  formatCurrency,
  type PeriodBucket,
} from "./reports-page-utils";
import { ReportsPeriodToggle, type ReportsPeriod } from "./ReportsPeriodToggle";
import {
  REPORT_CHART_COLORS,
  REPORT_CHART_AXIS_TEXT_LIGHT,
  REPORT_CHART_AXIS_TEXT_DARK,
  REPORT_CHART_GRID_LIGHT,
  REPORT_CHART_GRID_DARK,
  REPORT_CHART_REVENUE_LINE_LIGHT,
  REPORT_CHART_REVENUE_LINE_DARK,
} from "@/lib/constants/report-chart-colors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface ReportsMultiLineChartProps {
  data: ReportChartDataPoint[] | undefined;
  isLoading: boolean;
}

export function ReportsMultiLineChart({ data, isLoading }: ReportsMultiLineChartProps) {
  const [period, setPeriod] = useState<ReportsPeriod>("monthly");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartAxisColor = isDark ? REPORT_CHART_AXIS_TEXT_DARK : REPORT_CHART_AXIS_TEXT_LIGHT;
  const chartGridColor = isDark ? REPORT_CHART_GRID_DARK : REPORT_CHART_GRID_LIGHT;

  const trendData = useMemo((): PeriodBucket[] => {
    const daily = data ?? [];
    if (period === "daily") return aggregateByDay(daily);
    if (period === "weekly") return aggregateByWeek(daily);
    if (period === "yearly") return aggregateByYear(daily);
    return aggregateByMonth(daily);
  }, [data, period]);

  type MixedDataset = ChartData<"bar">["datasets"][0] | ChartData<"line">["datasets"][0];

  const chartData = useMemo((): ChartData<"bar"> | null => {
    if (trendData.length === 0) return null;
    const labels = trendData.map((d) => d.label);
    // Line y = top of each stack so the dot sits on top of the bar, not at revenue value
    const stackData = trendData.map((d) => d.table_sales + d.bar_sales + d.ticket_sales);
    const stackMiddleData = stackData.map((d) => d / 1.35);
    const stackTopData = stackData.map((d) => d / 4);

    const datasets: MixedDataset[] = [
      {
        type: "bar",
        label: "Table",
        data: trendData.map((d) => d.table_sales),
        stack: "stack0",
        order: 2,
        backgroundColor: REPORT_CHART_COLORS.chart3,
        borderColor: REPORT_CHART_COLORS.chart3,
        borderWidth: 0,
      },
      {
        type: "bar",
        label: "Bar",
        data: trendData.map((d) => d.bar_sales),
        stack: "stack0",
        order: 2,
        backgroundColor: REPORT_CHART_COLORS.chart2,
        borderColor: REPORT_CHART_COLORS.chart2,
        borderWidth: 0,
      },
      {
        type: "bar",
        label: "Ticket",
        data: trendData.map((d) => d.ticket_sales),
        stack: "stack0",
        order: 2,
        backgroundColor: REPORT_CHART_COLORS.chart1,
        borderColor: REPORT_CHART_COLORS.chart1,
        borderWidth: 0,
      },
      {
        type: "line" as const,
        label: "Event",
        data: stackMiddleData,
        yAxisID: "y",
        borderColor: REPORT_CHART_COLORS.event,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: REPORT_CHART_COLORS.event,
        pointBorderColor: REPORT_CHART_COLORS.event,
        pointBorderWidth: 2,
        order: 0,
      },
      {
        type: "line",
        label: "Revenue",
        data: stackTopData,
        borderColor: isDark ? REPORT_CHART_REVENUE_LINE_DARK : REPORT_CHART_REVENUE_LINE_LIGHT,
        backgroundColor: isDark ? `${REPORT_CHART_REVENUE_LINE_DARK}20` : `${REPORT_CHART_REVENUE_LINE_LIGHT}20`,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: isDark ? REPORT_CHART_REVENUE_LINE_DARK : REPORT_CHART_REVENUE_LINE_LIGHT,
        pointBorderColor: isDark ? REPORT_CHART_REVENUE_LINE_DARK : REPORT_CHART_REVENUE_LINE_LIGHT,
        pointBorderWidth: 2,
        order: 0,
      },
    ];
    return { labels, datasets } as ChartData<"bar">;
  }, [trendData, isDark]);

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, color: chartAxisColor },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label ?? "";
              const value = context.parsed?.y ?? context.raw;
              if (label === "Event") {
                const idx = context.dataIndex;
                const count = trendData[idx]?.event_count ?? 0;
                return `${label}: ${count} events`;
              }
              // Revenue line uses stack-top for position; show actual revenue in tooltip
              if (label === "Revenue") {
                const idx = context.dataIndex;
                const total = trendData[idx]?.total ?? 0;
                return `${label}: ${formatCurrency(total)}`;
              }
              return `${label}: ${formatCurrency(Number(value))}`;
            },
            afterBody: (context) => {
              if (context.length === 0 || trendData.length === 0) return "";
              const i = context[0].dataIndex;
              const point = trendData[i];
              if (!point) return "";
              const prev = trendData[i - 1];
              const growth =
                prev && prev.total > 0 ? (((point.total - prev.total) / prev.total) * 100).toFixed(0) : null;
              return growth != null ? `${Number(growth) >= 0 ? "+" : ""}${growth}% vs prior` : "";
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, maxTicksLimit: 12, color: chartAxisColor },
        },
        y: {
          beginAtZero: true,
          stacked: true,
          grid: { color: chartGridColor },
          ticks: {
            color: chartAxisColor,
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
      },
    }),
    [trendData, chartAxisColor, chartGridColor]
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
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
