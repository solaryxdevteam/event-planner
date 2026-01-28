"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getEventsForCalendar } from "@/lib/actions/dashboard";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { DashboardMetricsSkeleton } from "./DashboardMetricsSkeleton";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { FileText, Calendar, Building2, Zap } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardClient() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
  });

  // Fetch calendar events for current month
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: calendarEvents = [], isLoading: calendarLoading } = useQuery({
    queryKey: ["dashboard", "calendar", monthStart.toISOString()],
    queryFn: () => getEventsForCalendar(monthStart, monthEnd),
  });

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {statsLoading ? (
        <DashboardMetricsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardMetricCard
            title="Pending Approvals"
            value={stats?.pendingApprovals || 0}
            description="Requires your review today"
            icon={Zap}
            href="/dashboard/approvals"
            borderColor="border-l-blue-500"
          />
          <DashboardMetricCard
            title="Upcoming Events"
            value={stats?.upcomingEvents || 0}
            description="Scheduled in next 7 days"
            icon={Calendar}
            href="/dashboard/events"
            borderColor="border-l-green-500"
          />
          <DashboardMetricCard
            title="My Drafts"
            value={stats?.myDrafts || 0}
            description="Incomplete proposal"
            icon={FileText}
            href="/dashboard/events?tab=drafts"
            borderColor="border-l-purple-500"
          />
          <DashboardMetricCard
            title="Number of Venues"
            value={stats?.numberOfVenues || 0}
            description="Available locations"
            icon={Building2}
            href="/dashboard/venues"
            borderColor="border-l-orange-500"
          />
        </div>
      )}

      {/* Calendar Section */}
      {calendarLoading ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        </Card>
      ) : (
        <MonthlyCalendar events={calendarEvents} isLoading={calendarLoading} />
      )}
    </div>
  );
}
