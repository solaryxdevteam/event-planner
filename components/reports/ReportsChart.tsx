"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ReportsChartProps {
  data: ReportChartDataPoint[] | undefined;
  isLoading: boolean;
}

export function ReportsChart({ data, isLoading }: ReportsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return {
      labels: data.map((d) => d.date),
      datasets: [
        {
          label: "Table sales",
          data: data.map((d) => d.table_sales),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
        },
        {
          label: "Ticket sales",
          data: data.map((d) => d.ticket_sales),
          backgroundColor: "rgba(34, 197, 94, 0.7)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
        },
        {
          label: "Bar sales",
          data: data.map((d) => d.bar_sales),
          backgroundColor: "rgba(234, 179, 8, 0.7)",
          borderColor: "rgb(234, 179, 8)",
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const index = context.dataIndex;
              const point = data?.[index];
              if (point) return `Events: ${point.event_count}`;
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Date" },
          stacked: true,
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Sales" },
          stacked: true,
        },
      },
    }),
    [data]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by date</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.labels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by date</CardTitle>
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
      <CardHeader>
        <CardTitle>Sales by date</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
