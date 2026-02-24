"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineController,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { useApprovedReportsList } from "@/lib/hooks/use-reports";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks } from "lucide-react";
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "./reports/utils";
import type { ReportsSummary, ReportsInsights } from "./reports/utils";
import {
  REPORT_CHART_COLORS,
  REPORT_CHART_TOTAL_LINE,
  REPORT_CHART_AXIS_TEXT_LIGHT,
  REPORT_CHART_AXIS_TEXT_DARK,
  REPORT_CHART_GRID_LIGHT,
  REPORT_CHART_GRID_DARK,
} from "@/lib/constants/report-chart-colors";
import { ReportsKPICards } from "./reports/ReportsKPICards";
import { ReportsInsightsCard } from "./reports/ReportsInsightsCard";
import { ReportsRevenueBreakdownCard } from "./reports/ReportsRevenueBreakdownCard";
import { ReportsRevenueTrendCard } from "./reports/ReportsRevenueTrendCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineController,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend
);

type PeriodBucket = {
  label: string;
  key: string;
  table_sales: number;
  bar_sales: number;
  ticket_sales: number;
  event_count: number;
  total: number;
};

function aggregateByWeek(daily: ReportChartDataPoint[]): PeriodBucket[] {
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
  return sorted.map(([weekStart, agg]) => {
    const total = agg.table_sales + agg.bar_sales + agg.ticket_sales;
    return {
      weekStart,
      label: format(new Date(weekStart + "T12:00:00"), "MMM d"),
      key: weekStart,
      ...agg,
      total,
    };
  });
}

function aggregateByMonth(daily: ReportChartDataPoint[]): PeriodBucket[] {
  const byMonth = new Map<
    string,
    { table_sales: number; bar_sales: number; ticket_sales: number; event_count: number }
  >();
  for (const d of daily) {
    const date = new Date(d.date + "T12:00:00");
    const key = format(date, "yyyy-MM");
    const cur = byMonth.get(key) ?? { table_sales: 0, bar_sales: 0, ticket_sales: 0, event_count: 0 };
    cur.table_sales += d.table_sales;
    cur.bar_sales += d.bar_sales;
    cur.ticket_sales += d.ticket_sales;
    cur.event_count += d.event_count;
    byMonth.set(key, cur);
  }
  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([monthKey, agg]) => {
    const total = agg.table_sales + agg.bar_sales + agg.ticket_sales;
    const [y, m] = monthKey.split("-").map(Number);
    return {
      key: monthKey,
      label: format(new Date(y, m - 1, 1), "MMM ''yy"),
      ...agg,
      total,
    };
  });
}

function aggregateByDay(daily: ReportChartDataPoint[]): PeriodBucket[] {
  return daily
    .map((d) => ({
      key: d.date,
      label: format(new Date(d.date + "T12:00:00"), "MMM d"),
      table_sales: d.table_sales,
      bar_sales: d.bar_sales,
      ticket_sales: d.ticket_sales,
      event_count: d.event_count,
      total: d.table_sales + d.bar_sales + d.ticket_sales,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function DashboardReportsCard() {
  const now = new Date();
  const dateTo = format(endOfMonth(now), "yyyy-MM-dd");
  const dateFrom = format(startOfMonth(subMonths(now, 11)), "yyyy-MM-dd");

  const { data: listData, isLoading } = useApprovedReportsList({
    page: 1,
    limit: 5,
    chart: true,
    dateFrom,
    dateTo,
  });
  const dailyData = useMemo(() => listData?.chartData ?? [], [listData?.chartData]);
  const monthlyData = useMemo(() => aggregateByMonth(dailyData), [dailyData]);
  const weeklyData = useMemo(() => aggregateByWeek(dailyData), [dailyData]);
  const dayData = useMemo(() => aggregateByDay(dailyData), [dailyData]);

  const [period, setPeriod] = useState<"monthly" | "weekly" | "daily">("monthly");
  const trendData = period === "monthly" ? monthlyData : period === "weekly" ? weeklyData : dayData;

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartAxisColor = isDark ? REPORT_CHART_AXIS_TEXT_DARK : REPORT_CHART_AXIS_TEXT_LIGHT;
  const chartGridColor = isDark ? REPORT_CHART_GRID_DARK : REPORT_CHART_GRID_LIGHT;

  const summary = useMemo(() => {
    const totalTable = dailyData.reduce((s, d) => s + d.table_sales, 0);
    const totalBar = dailyData.reduce((s, d) => s + d.bar_sales, 0);
    const totalTicket = dailyData.reduce((s, d) => s + d.ticket_sales, 0);
    const totalSales = totalTable + totalBar + totalTicket;
    const totalEvents = dailyData.reduce((s, d) => s + d.event_count, 0);
    const totalAttendance = dailyData.reduce((s, d) => s + (d.attendance ?? 0), 0);
    const avgPerEvent = totalEvents > 0 ? totalSales / totalEvents : 0;
    return {
      totalSales,
      totalEvents,
      totalAttendance,
      avgPerEvent,
      totalTable,
      totalBar,
      totalTicket,
    };
  }, [dailyData]);

  const insights = useMemo(() => {
    if (monthlyData.length === 0)
      return {
        bestMonth: null as { label: string; total: number } | null,
        worstMonth: null as { label: string; total: number } | null,
        topCategory: "Ticket" as "Ticket" | "Bar" | "Table",
        topCategoryPct: 0,
        growthPct: 0,
        eventsGrowthPct: 0,
        avgRevenueGrowthPct: 0,
        attendance: summary.totalAttendance,
        revenuePerGuest: summary.totalSales / (summary.totalAttendance || 1),
      };
    const best = monthlyData.reduce((a, b) => (a.total >= b.total ? a : b), monthlyData[0]);
    const worst = monthlyData.reduce((a, b) => (a.total <= b.total ? a : b), monthlyData[0]);
    const totals = [summary.totalTicket, summary.totalBar, summary.totalTable];
    const names: ("Ticket" | "Bar" | "Table")[] = ["Ticket", "Bar", "Table"];
    const i = totals.indexOf(Math.max(...totals));
    const topCategory = names[i];
    const topCategoryPct = summary.totalSales > 0 ? (totals[i] / summary.totalSales) * 100 : 0;
    let growthPct = 0;
    let eventsGrowthPct = 0;
    let avgRevenueGrowthPct = 0;
    if (monthlyData.length >= 2) {
      const recent = monthlyData.slice(-2);
      const prev = recent[0];
      const curr = recent[1];
      if (prev.total > 0) growthPct = ((curr.total - prev.total) / prev.total) * 100;
      if (prev.event_count > 0) eventsGrowthPct = ((curr.event_count - prev.event_count) / prev.event_count) * 100;
      const prevAvg = prev.event_count > 0 ? prev.total / prev.event_count : 0;
      const currAvg = curr.event_count > 0 ? curr.total / curr.event_count : 0;
      if (prevAvg > 0) avgRevenueGrowthPct = ((currAvg - prevAvg) / prevAvg) * 100;
    }
    return {
      bestMonth: { label: best.label, total: best.total },
      worstMonth: { label: worst.label, total: worst.total },
      topCategory,
      topCategoryPct,
      growthPct,
      eventsGrowthPct,
      avgRevenueGrowthPct,
      attendance: summary.totalAttendance,
      revenuePerGuest: summary.totalAttendance > 0 ? summary.totalSales / summary.totalAttendance : 0,
    };
  }, [monthlyData, summary]);

  const donutData = useMemo(() => {
    if (summary.totalSales === 0) return null;
    return {
      labels: ["Ticket", "Bar", "Table"],
      datasets: [
        {
          data: [summary.totalTicket, summary.totalBar, summary.totalTable],
          backgroundColor: [REPORT_CHART_COLORS.chart1, REPORT_CHART_COLORS.chart2, REPORT_CHART_COLORS.chart3],
          borderWidth: 0,
        },
      ],
    };
  }, [summary.totalTicket, summary.totalBar, summary.totalTable, summary.totalSales]);

  const lineChartData = useMemo(() => {
    if (trendData.length === 0) return null;
    type MixedDataset = ChartData<"bar">["datasets"][0] | ChartData<"line">["datasets"][0];
    const datasets: MixedDataset[] = [
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
        label: "Table",
        data: trendData.map((d) => d.table_sales),
        stack: "stack0",
        order: 2,
        backgroundColor: REPORT_CHART_COLORS.chart3,
        borderColor: REPORT_CHART_COLORS.chart3,
        borderWidth: 0,
      },
      {
        type: "line" as const,
        label: "Total Revenue",
        data: trendData.map((d) => d.total),
        borderColor: REPORT_CHART_TOTAL_LINE,
        backgroundColor: `${REPORT_CHART_TOTAL_LINE}30`,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: REPORT_CHART_TOTAL_LINE,
        pointBorderColor: REPORT_CHART_TOTAL_LINE,
        order: 0,
      },
      {
        type: "line" as const,
        label: "Events",
        data: trendData.map((d) => d.event_count),
        yAxisID: "y1",
        borderColor: chartAxisColor,
        backgroundColor: `${chartAxisColor}20`,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: chartAxisColor,
        pointBorderColor: chartAxisColor,
        borderDash: [5, 5],
        order: 0,
      },
    ];
    return {
      labels: trendData.map((d) => d.label),
      datasets,
    } as ChartData<"bar">;
  }, [trendData, chartAxisColor]);

  const donutOptions: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, padding: 12, color: chartAxisColor },
        },
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
    [chartAxisColor]
  );

  const lineChartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { usePointStyle: true, padding: 12, color: chartAxisColor },
          filter: (item: { datasetIndex: number }, data: { datasets?: Array<{ type?: string }> }) => {
            const ds = data?.datasets?.[item.datasetIndex];
            return ds && "type" in ds && ds.type === "line";
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label ?? "";
              const value = context.parsed?.y ?? context.raw;
              if (label === "Events") return `${label}: ${value}`;
              return `${label}: ${formatCurrency(Number(value))}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, maxTicksLimit: 10, color: chartAxisColor },
        },
        y: {
          type: "linear",
          beginAtZero: true,
          stacked: true,
          grid: { color: chartGridColor },
          ticks: {
            color: chartAxisColor,
            callback: (v) => (typeof v === "number" ? formatCurrency(v) : v),
          },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: chartAxisColor },
        },
      },
    }),
    [trendData, chartAxisColor, chartGridColor]
  );

  return (
    <Card className="min-w-0 overflow-hidden gap-2 p-3 sm:p-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:gap-4 space-y-0 px-0">
        <div className="w-full flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
            Reports
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">· All events</span>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/dashboard/reports">View all</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ReportsContent
          isLoading={isLoading}
          summary={summary}
          insights={insights}
          donutData={donutData as ChartData<"doughnut">}
          donutOptions={donutOptions}
          lineChartData={lineChartData}
          lineChartOptions={lineChartOptions}
          period={period}
          setPeriod={setPeriod}
        />
      </CardContent>
    </Card>
  );
}

const EMPTY_INSIGHTS: ReportsInsights = {
  bestMonth: null,
  worstMonth: null,
  topCategory: "Ticket",
  topCategoryPct: 0,
  growthPct: 0,
  eventsGrowthPct: 0,
  avgRevenueGrowthPct: 0,
  attendance: 0,
  revenuePerGuest: 0,
};

const EMPTY_SUMMARY: ReportsSummary = {
  totalSales: 0,
  totalEvents: 0,
  totalAttendance: 0,
  avgPerEvent: 0,
  totalTable: 0,
  totalBar: 0,
  totalTicket: 0,
};

function ReportsContent({
  isLoading,
  summary,
  insights,
  donutData,
  donutOptions,
  lineChartData,
  lineChartOptions,
  period,
  setPeriod,
}: {
  isLoading: boolean;
  summary: ReportsSummary;
  insights: ReportsInsights;
  donutData: ChartData<"doughnut"> | null;
  donutOptions: ChartOptions<"doughnut">;
  lineChartData: ChartData<"bar"> | null;
  lineChartOptions: ChartOptions<"bar">;
  period: "monthly" | "weekly" | "daily";
  setPeriod: (p: "monthly" | "weekly" | "daily") => void;
}) {
  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Skeleton className="h-[320px] rounded-lg" />
          <Skeleton className="h-[320px] rounded-lg col-span-2" />
        </div>
        <Skeleton className="h-[280px] rounded-lg" />
      </>
    );
  }

  const hasData = summary.totalSales > 0 || summary.totalEvents > 0;

  if (!hasData) {
    return (
      <>
        <ReportsKPICards summary={EMPTY_SUMMARY} insights={EMPTY_INSIGHTS} />
        <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground mb-4 px-4">
          No report data for this period.
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/reports">View reports</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <ReportsKPICards summary={summary} insights={insights} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <ReportsInsightsCard insights={insights} />
        <ReportsRevenueBreakdownCard
          donutData={donutData}
          donutOptions={donutOptions}
          totalSales={summary.totalSales}
        />
      </div>
      <ReportsRevenueTrendCard
        lineChartData={lineChartData}
        lineChartOptions={lineChartOptions}
        period={period}
        onPeriodChange={setPeriod}
      />
    </>
  );
}
