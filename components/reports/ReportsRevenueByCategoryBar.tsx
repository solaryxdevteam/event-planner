"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
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
import { formatCurrency } from "./reports-page-utils";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

interface ReportsRevenueByCategoryBarProps {
  data: ReportChartDataPoint[] | undefined;
  isLoading: boolean;
}

type CategoryRow = { label: string; value: number; color: string };

export function ReportsRevenueByCategoryBar({ data, isLoading }: ReportsRevenueByCategoryBarProps) {
  const colors = useChartColors();

  const sortedCategories = useMemo((): CategoryRow[] => {
    const list = data ?? [];
    const ticket = list.reduce((s, d) => s + d.ticket_sales, 0);
    const bar = list.reduce((s, d) => s + d.bar_sales, 0);
    const table = list.reduce((s, d) => s + d.table_sales, 0);
    const rows: CategoryRow[] = [
      { label: "Ticket", value: ticket, color: colors.chart1 },
      { label: "Bar", value: bar, color: colors.chart2 },
      { label: "Table", value: table, color: colors.chart3 },
    ];
    return rows.sort((a, b) => b.value - a.value);
  }, [data, colors.chart1, colors.chart2, colors.chart3]);

  const chartData = useMemo((): ChartData<"bar"> | null => {
    if (sortedCategories.length === 0 || sortedCategories.every((c) => c.value === 0)) return null;
    return {
      labels: sortedCategories.map((c) => c.label),
      datasets: [
        {
          label: "Revenue",
          data: sortedCategories.map((c) => c.value),
          backgroundColor: sortedCategories.map((c) => c.color),
          borderWidth: 0,
        },
      ],
    };
  }, [sortedCategories]);

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw as number;
              const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
              return `${formatCurrency(value)} (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "hsl(var(--border))" },
          ticks: {
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
        y: {
          grid: { display: false },
        },
      },
    }),
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
            No data for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by category (sorted)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
