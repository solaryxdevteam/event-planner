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
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useApprovedReportsList } from "@/lib/hooks/use-reports";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, TrendingUp, DollarSign, Target } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import Link from "next/link";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

/** Aggregate daily chart points into weekly buckets (week start = Monday). */
function aggregateByWeek(daily: ReportChartDataPoint[]): Array<{
  weekLabel: string;
  weekStart: string;
  table_sales: number;
  bar_sales: number;
  ticket_sales: number;
  event_count: number;
}> {
  const byWeek = new Map<
    string,
    { table_sales: number; bar_sales: number; ticket_sales: number; event_count: number }
  >();
  for (const d of daily) {
    const date = new Date(d.date + "T12:00:00");
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    const cur = byWeek.get(key) ?? { table_sales: 0, bar_sales: 0, ticket_sales: 0, event_count: 0 };
    cur.table_sales += d.table_sales;
    cur.bar_sales += d.bar_sales;
    cur.ticket_sales += d.ticket_sales;
    cur.event_count += d.event_count;
    byWeek.set(key, cur);
  }
  const sorted = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([weekStart, agg]) => ({
    weekLabel: format(new Date(weekStart + "T12:00:00"), "MMM d"),
    weekStart,
    table_sales: agg.table_sales,
    bar_sales: agg.bar_sales,
    ticket_sales: agg.ticket_sales,
    event_count: agg.event_count,
  }));
}

export function DashboardReportsCard() {
  const now = new Date();
  const dateTo = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const dateFrom = format(startOfWeek(subWeeks(now, 11), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: listData, isLoading } = useApprovedReportsList({
    page: 1,
    limit: 5,
    chart: true,
    dateFrom,
    dateTo,
  });
  const dailyData = useMemo(() => listData?.chartData ?? [], [listData?.chartData]);
  const weeklyData = useMemo(() => aggregateByWeek(dailyData), [dailyData]);

  const { chartConfig, summary } = useMemo(() => {
    const totalEvents = weeklyData.reduce((s, d) => s + d.event_count, 0);
    const totalTable = weeklyData.reduce((s, d) => s + d.table_sales, 0);
    const totalBar = weeklyData.reduce((s, d) => s + d.bar_sales, 0);
    const totalTicket = weeklyData.reduce((s, d) => s + d.ticket_sales, 0);
    const totalSales = totalTable + totalBar + totalTicket;
    const avgEventValue = totalEvents > 0 ? totalSales / totalEvents : 0;
    return {
      chartConfig:
        weeklyData.length > 0
          ? {
              labels: weeklyData.map((d) => d.weekLabel),
              datasets: [
                {
                  type: "bar" as const,
                  label: "Table sales",
                  data: weeklyData.map((d) => d.table_sales),
                  backgroundColor: "rgba(34, 197, 94, 0.8)",
                  borderColor: "rgb(34, 197, 94)",
                  borderWidth: 1,
                  stack: "sales",
                },
                {
                  type: "bar" as const,
                  label: "Bar sales",
                  data: weeklyData.map((d) => d.bar_sales),
                  backgroundColor: "rgba(59, 130, 246, 0.8)",
                  borderColor: "rgb(59, 130, 246)",
                  borderWidth: 1,
                  stack: "sales",
                },
                {
                  type: "bar" as const,
                  label: "Ticket sales",
                  data: weeklyData.map((d) => d.ticket_sales),
                  backgroundColor: "rgba(168, 85, 247, 0.8)",
                  borderColor: "rgb(168, 85, 247)",
                  borderWidth: 1,
                  stack: "sales",
                },
              ],
            }
          : null,
      summary: {
        totalEvents,
        totalSales,
        avgEventValue,
      },
    };
  }, [weeklyData]);

  const chartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const i = context.dataIndex;
              const point = weeklyData[i];
              if (point) return `Events: ${point.event_count}`;
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Week" },
          stacked: true,
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          stacked: true,
          title: { display: true, text: "Sales ($)" },
        },
      },
    }),
    [weeklyData]
  );

  return (
    <Card className="min-w-0 overflow-hidden gap-2 p-3 sm:p-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:gap-4 space-y-0 px-0">
        <div className="w-full flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
            Reports
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">· Weekly, all events</span>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/dashboard/reports">View all</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ReportsContent isLoading={isLoading} chartConfig={chartConfig} chartOptions={chartOptions} summary={summary} />
      </CardContent>
    </Card>
  );
}

function ReportsContent({
  isLoading,
  chartConfig,
  chartOptions,
  summary,
}: {
  isLoading: boolean;
  chartConfig: { labels: string[]; datasets: unknown[] } | null;
  chartOptions: ChartOptions<"bar">;
  summary: { totalEvents: number; totalSales: number; avgEventValue: number };
}) {
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[200px] sm:h-[280px] w-full rounded-lg mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 sm:h-16 rounded-lg" />
          ))}
        </div>
      </>
    );
  }

  if (!chartConfig || chartConfig.labels.length === 0) {
    return (
      <>
        <div className="flex h-[200px] sm:h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs sm:text-sm text-muted-foreground mb-4 px-4">
          No report data for this period.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <SummaryCard icon={TrendingUp} label="Events" value={`${summary.totalEvents}`} />
          <SummaryCard icon={DollarSign} label="Sales" value={formatCurrency(summary.totalSales)} />
          <SummaryCard icon={Target} label="Avg Event Value" value={formatCurrency(summary.avgEventValue)} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-[200px] sm:h-[280px] w-full mb-4">
        <Chart type="bar" data={chartConfig as never} options={chartOptions} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <SummaryCard icon={TrendingUp} label="Events" value={`${summary.totalEvents}`} />
        <SummaryCard icon={DollarSign} label="Sales" value={formatCurrency(summary.totalSales)} />
        <SummaryCard icon={Target} label="Avg Event Value" value={formatCurrency(summary.avgEventValue)} />
      </div>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2 sm:p-3">
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        {label}
      </div>
      <p className="font-semibold text-xs sm:text-sm">{value}</p>
    </div>
  );
}
