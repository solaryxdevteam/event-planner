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

export function aggregateByYear(daily: ReportChartDataPoint[]): PeriodBucket[] {
  const byYear = new Map<
    string,
    { table_sales: number; bar_sales: number; ticket_sales: number; event_count: number }
  >();
  for (const d of daily) {
    const date = new Date(d.date + "T12:00:00");
    const key = format(date, "yyyy");
    const cur = byYear.get(key) ?? { table_sales: 0, bar_sales: 0, ticket_sales: 0, event_count: 0 };
    cur.table_sales += d.table_sales;
    cur.bar_sales += d.bar_sales;
    cur.ticket_sales += d.ticket_sales;
    cur.event_count += d.event_count;
    byYear.set(key, cur);
  }
  const sorted = Array.from(byYear.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([yearKey, agg]) => {
    const total = agg.table_sales + agg.bar_sales + agg.ticket_sales;
    return {
      key: yearKey,
      label: yearKey,
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

/**
 * Compute KPI summary for the reports page.
 * Growth percentages compare current date range vs same date range last year (priorYearChartData).
 */
export function computeReportsPageSummary(
  chartData: ReportChartDataPoint[] | undefined,
  priorYearChartData?: ReportChartDataPoint[] | undefined
): ReportsPageSummary {
  const data = chartData ?? [];
  const priorData = priorYearChartData ?? [];

  const totalEvents = data.reduce((s, d) => s + d.event_count, 0);
  const totalSales = data.reduce((s, d) => s + d.table_sales + d.ticket_sales + d.bar_sales, 0);
  const avgSalesPerEvent = totalEvents > 0 ? totalSales / totalEvents : null;
  const revenuePerGuest = totalEvents > 0 ? totalSales / totalEvents : null;

  const priorTotalEvents = priorData.reduce((s, d) => s + d.event_count, 0);
  const priorTotalSales = priorData.reduce((s, d) => s + d.table_sales + d.ticket_sales + d.bar_sales, 0);
  const priorAvgSalesPerEvent = priorTotalEvents > 0 ? priorTotalSales / priorTotalEvents : 0;

  const byMonth = aggregateByMonth(data);
  const byMonthPrior = aggregateByMonth(priorData);

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

  // Compare current period vs same period last year
  if (priorTotalSales > 0) {
    growthPct = ((totalSales - priorTotalSales) / priorTotalSales) * 100;
  }
  if (priorTotalEvents > 0) {
    eventsGrowthPct = ((totalEvents - priorTotalEvents) / priorTotalEvents) * 100;
  }
  if (priorAvgSalesPerEvent > 0 && avgSalesPerEvent != null) {
    avgRevenueGrowthPct = ((avgSalesPerEvent - priorAvgSalesPerEvent) / priorAvgSalesPerEvent) * 100;
    revenuePerGuestGrowthPct = avgRevenueGrowthPct;
  }
  // Best month: compare same calendar month last year (e.g. Mar '25 vs Mar '24)
  if (bestMonth && byMonth.length > 0 && byMonthPrior.length > 0) {
    const bestEntry = byMonth.find((m) => m.label === bestMonth.label && m.total === bestMonth.total);
    if (bestEntry) {
      const [y] = bestEntry.key.split("-").map(Number);
      const priorYearKey = `${y - 1}-${bestEntry.key.slice(5)}`;
      const priorSameMonth = byMonthPrior.find((m) => m.key === priorYearKey);
      if (priorSameMonth && priorSameMonth.total > 0) {
        bestMonthGrowthPct = ((bestMonth.total - priorSameMonth.total) / priorSameMonth.total) * 100;
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
