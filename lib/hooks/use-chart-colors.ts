"use client";

import { useState, useEffect } from "react";

const FALLBACK_COLORS = {
  chart1: "oklch(0.646 0.222 41.116)",
  chart2: "oklch(0.6 0.118 184.704)",
  chart3: "oklch(0.398 0.07 227.392)",
};

export type ChartColors = typeof FALLBACK_COLORS;

/** Get chart colors from CSS theme variables (project color theme). */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK_COLORS);
  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const next = {
      chart1: style.getPropertyValue("--chart-1").trim() || FALLBACK_COLORS.chart1,
      chart2: style.getPropertyValue("--chart-2").trim() || FALLBACK_COLORS.chart2,
      chart3: style.getPropertyValue("--chart-3").trim() || FALLBACK_COLORS.chart3,
    };
    queueMicrotask(() => setColors(next));
  }, []);
  return colors;
}
