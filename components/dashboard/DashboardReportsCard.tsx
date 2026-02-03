"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useApprovedReportsList } from "@/lib/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, TrendingUp, BarChart3, DollarSign, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import Link from "next/link";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function DashboardReportsCard() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const now = new Date();
  const dateFrom =
    period === "monthly" ? format(startOfMonth(now), "yyyy-MM-dd") : format(startOfYear(now), "yyyy-MM-dd");
  const dateTo = period === "monthly" ? format(endOfMonth(now), "yyyy-MM-dd") : format(endOfYear(now), "yyyy-MM-dd");

  const { data: listData, isLoading } = useApprovedReportsList({
    page: 1,
    limit: 5,
    chart: true,
    dateFrom,
    dateTo,
  });
  const chartData = useMemo(() => listData?.chartData ?? [], [listData?.chartData]);

  const { chartConfig, summary } = useMemo(() => {
    const totalEvents = chartData.reduce((s, d) => s + d.event_count, 0);
    const totalProfit = chartData.reduce((s, d) => s + (d.net_profit ?? 0), 0);
    const totalBudget = chartData.reduce((s, d) => s + ((d as { total_budget?: number }).total_budget ?? 0), 0);
    const avgEventValue = totalEvents > 0 ? totalProfit / totalEvents : 0;
    return {
      chartConfig:
        chartData.length > 0
          ? {
              labels: chartData.map((d) => d.date),
              datasets: [
                {
                  type: "bar" as const,
                  label: "Revenue",
                  data: chartData.map((d) => d.net_profit),
                  backgroundColor: "rgba(34, 197, 94, 0.7)",
                  borderColor: "rgb(34, 197, 94)",
                  borderWidth: 1,
                  yAxisID: "y",
                },
                {
                  type: "line" as const,
                  label: "Events",
                  data: chartData.map((d) => d.event_count),
                  borderColor: "rgb(134, 239, 172)",
                  backgroundColor: "rgba(134, 239, 172, 0.1)",
                  borderWidth: 2,
                  fill: false,
                  tension: 0.3,
                  pointRadius: 3,
                  yAxisID: "y1",
                },
              ],
            }
          : null,
      summary: {
        totalEvents,
        totalProfit,
        totalBudget,
        avgEventValue,
      },
    };
  }, [chartData]);

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
              const point = chartData[i];
              if (point) return `Events: ${point.event_count}`;
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Date" },
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "Revenue" },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Events" },
        },
      },
    }),
    [chartData]
  );

  const periodLabel = period === "monthly" ? format(now, "MMMM yyyy") : format(now, "yyyy");

  return (
    <Tabs value={period} onValueChange={(v) => setPeriod(v as "monthly" | "yearly")}>
      <Card className="min-w-0 overflow-hidden gap-2 p-3 sm:p-4 shadow-none">
        <CardHeader className="flex flex-col gap-2 sm:gap-4 space-y-0 px-0">
          {/* Title and View all in one line */}
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
              Reports
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">· {periodLabel}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/dashboard/reports">View all</Link>
            </Button>
          </div>
          {/* Tabs below */}
          <TabsList className="h-8 sm:h-9 w-fit">
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="yearly" className="text-xs sm:text-sm">
              Yearly
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="px-0">
          <TabsContent value="monthly" className="mt-4">
            <ReportsContent
              isLoading={isLoading}
              chartConfig={chartConfig}
              chartOptions={chartOptions}
              summary={summary}
            />
          </TabsContent>
          <TabsContent value="yearly" className="mt-4">
            <ReportsContent
              isLoading={isLoading}
              chartConfig={chartConfig}
              chartOptions={chartOptions}
              summary={summary}
            />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
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
  summary: { totalEvents: number; totalProfit: number; totalBudget: number; avgEventValue: number };
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <SummaryCard icon={TrendingUp} label="Events" value={`${summary.totalEvents}`} />
          <SummaryCard
            icon={BarChart3}
            label="Budget"
            value={summary.totalBudget > 0 ? formatCurrency(summary.totalBudget) : "—"}
          />
          <SummaryCard icon={DollarSign} label="Profit" value={formatCurrency(summary.totalProfit)} />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <SummaryCard icon={TrendingUp} label="Events" value={`${summary.totalEvents}`} />
        <SummaryCard
          icon={BarChart3}
          label="Budget"
          value={summary.totalBudget > 0 ? formatCurrency(summary.totalBudget) : "—"}
        />
        <SummaryCard icon={DollarSign} label="Profit" value={formatCurrency(summary.totalProfit)} />
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
