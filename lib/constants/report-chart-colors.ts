/**
 * Report chart color palette
 * Ticket: Warm Orange (energetic, transactional, attention-grabbing)
 * Bar: Teal (balanced, modern, fresh — secondary revenue)
 * Table: Deep Slate (stable, professional, anchors the palette)
 */

/** Lighter orange for better contrast and readability */
export const REPORT_CHART_TICKET = "#FB923C";
export const REPORT_CHART_BAR = "#14B8A6";
export const REPORT_CHART_TABLE = "#1E293B";
export const REPORT_CHART_TEXT = "#0F172A";

/** Event bar: light slate so it stays distinct in the stack */
export const REPORT_CHART_EVENT = "#94A3B8";

/** Total Revenue line (legacy/fallback): slate-400 */
export const REPORT_CHART_TOTAL_LINE = "#94A3B8";

/** Revenue line – light mode: red so it stands out over orange/teal/slate bars */
export const REPORT_CHART_REVENUE_LINE_LIGHT = "#DC2626";
/** Revenue line – dark mode: light slate so it stays visible on dark background */
export const REPORT_CHART_REVENUE_LINE_DARK = "#E2E8F0";

/** Chart axis/legend text: visible in light mode */
export const REPORT_CHART_AXIS_TEXT_LIGHT = "#475569";
/** Chart axis/legend text: visible in dark mode */
export const REPORT_CHART_AXIS_TEXT_DARK = "#94A3B8";

/** Chart horizontal grid: light mode (nice gray) */
export const REPORT_CHART_GRID_LIGHT = "#E2E8F0";
/** Chart horizontal grid: dark mode (lighter, not dark) */
export const REPORT_CHART_GRID_DARK = "rgba(255, 255, 255, 0.12)";

/** Report chart colors as chart1/chart2/chart3 (Ticket, Bar, Table) for drop-in use with Chart.js */
export const REPORT_CHART_COLORS = {
  chart1: REPORT_CHART_TICKET,
  chart2: REPORT_CHART_BAR,
  chart3: REPORT_CHART_TABLE,
  ticket: REPORT_CHART_TICKET,
  bar: REPORT_CHART_BAR,
  table: REPORT_CHART_TABLE,
  text: REPORT_CHART_TEXT,
  totalLine: REPORT_CHART_TOTAL_LINE,
  event: REPORT_CHART_EVENT,
} as const;
