export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export type ReportsSummary = {
  totalSales: number;
  totalEvents: number;
  totalAttendance: number;
  avgPerEvent: number;
  totalTable: number;
  totalBar: number;
  totalTicket: number;
};

export type ReportsInsights = {
  bestMonth: { label: string; total: number } | null;
  worstMonth: { label: string; total: number } | null;
  topCategory: "Ticket" | "Bar" | "Table";
  topCategoryPct: number;
  growthPct: number;
  eventsGrowthPct: number;
  avgRevenueGrowthPct: number;
  attendance: number;
  revenuePerGuest: number;
};
