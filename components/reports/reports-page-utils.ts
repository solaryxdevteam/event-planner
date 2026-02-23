import { format, startOfWeek } from "date-fns";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSales(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PeriodBucket = {
  label: string;
  key: string;
  table_sales: number;
  bar_sales: number;
  ticket_sales: number;
  event_count: number;
  total: number;
};

export function aggregateByDay(daily: ReportChartDataPoint[]): PeriodBucket[] {
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

export function aggregateByWeek(daily: ReportChartDataPoint[]): PeriodBucket[] {
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

export function aggregateByMonth(daily: ReportChartDataPoint[]): PeriodBucket[] {
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

export type ReportsPageSummary = {
  totalEvents: number;
  totalSales: number;
  avgSalesPerEvent: number | null;
  revenuePerGuest: number | null;
  bestMonth: { label: string; total: number } | null;
  growthPct: number;
  eventsGrowthPct: number;
  avgRevenueGrowthPct: number;
  revenuePerGuestGrowthPct: number;
  bestMonthGrowthPct: number;
};

export function computeReportsPageSummary(chartData: ReportChartDataPoint[] | undefined): ReportsPageSummary {
  const data = chartData ?? [];
  const totalEvents = data.reduce((s, d) => s + d.event_count, 0);
  const totalSales = data.reduce((s, d) => s + d.table_sales + d.ticket_sales + d.bar_sales, 0);
  const avgSalesPerEvent = totalEvents > 0 ? totalSales / totalEvents : null;
  const revenuePerGuest = totalEvents > 0 ? totalSales / totalEvents : null;

  const byMonth = aggregateByMonth(data);
  const bestMonth =
    byMonth.length > 0
      ? (() => {
          const best = byMonth.reduce((a, b) => (a.total >= b.total ? a : b), byMonth[0]);
          return { label: best.label, total: best.total };
        })()
      : null;

  let growthPct = 0;
  let eventsGrowthPct = 0;
  let avgRevenueGrowthPct = 0;
  let revenuePerGuestGrowthPct = 0;
  let bestMonthGrowthPct = 0;

  if (byMonth.length >= 2) {
    const recent = byMonth.slice(-2);
    const prev = recent[0];
    const curr = recent[1];
    if (prev.total > 0) growthPct = ((curr.total - prev.total) / prev.total) * 100;
    if (prev.event_count > 0) eventsGrowthPct = ((curr.event_count - prev.event_count) / prev.event_count) * 100;
    const prevAvg = prev.event_count > 0 ? prev.total / prev.event_count : 0;
    const currAvg = curr.event_count > 0 ? curr.total / curr.event_count : 0;
    if (prevAvg > 0) {
      avgRevenueGrowthPct = ((currAvg - prevAvg) / prevAvg) * 100;
      revenuePerGuestGrowthPct = avgRevenueGrowthPct;
    }
    if (bestMonth) {
      const bestIdx = byMonth.findIndex((m) => m.label === bestMonth.label);
      if (bestIdx > 0) {
        const prevBest = byMonth[bestIdx - 1];
        if (prevBest.total > 0) bestMonthGrowthPct = ((bestMonth.total - prevBest.total) / prevBest.total) * 100;
      }
    }
  }

  return {
    totalEvents,
    totalSales,
    avgSalesPerEvent,
    revenuePerGuest,
    bestMonth,
    growthPct,
    eventsGrowthPct,
    avgRevenueGrowthPct,
    revenuePerGuestGrowthPct,
    bestMonthGrowthPct,
  };
}
