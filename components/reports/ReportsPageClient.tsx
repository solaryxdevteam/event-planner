"use client";

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useApprovedReportsList } from "@/lib/hooks/use-reports";
import { useEvents } from "@/lib/hooks/use-events";
import { useVenues } from "@/lib/hooks/use-venues";
import { useActiveDjs } from "@/lib/hooks/use-djs";
import { apiClient } from "@/lib/services/client/api-client";
import * as reportsClientService from "@/lib/services/client/reports.client.service";
import { ReportsFilters, type ReportsFiltersState, type UserOption } from "./ReportsFilters";
import { computeReportsPageSummary } from "./reports-page-utils";
import { ReportsPageKPIRow } from "./ReportsPageKPIRow";
import { ReportsMultiLineChart } from "./ReportsMultiLineChart";
import { ReportsPageRevenueBreakdown } from "./ReportsPageRevenueBreakdown";
import { ReportsTable } from "./ReportsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const LIMIT = 10;

async function fetchReportUsers(): Promise<UserOption[]> {
  const response = await apiClient.get<{
    data: UserOption[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>("/api/users", {
    params: { limit: 200, statusFilter: "active" },
  });
  return response.data ?? [];
}

export function ReportsPageClient() {
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const now = new Date();
  const [filters, setFilters] = useState<ReportsFiltersState>({
    eventId: null,
    venueId: null,
    dateFrom: format(startOfMonth(subMonths(now, 11)), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
    userId: null,
    djId: null,
  });
  const [appliedFilters, setAppliedFilters] = useState<ReportsFiltersState>(filters);

  const listParams = useMemo(
    () => ({
      page,
      limit: LIMIT,
      eventId: appliedFilters.eventId,
      venueId: appliedFilters.venueId,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      userId: appliedFilters.userId,
      djId: appliedFilters.djId,
      chart: true,
    }),
    [page, appliedFilters]
  );

  const { data: listData, isLoading: isLoadingReports, error: reportsError } = useApprovedReportsList(listParams);
  const reports = listData?.reports ?? [];
  const pagination = listData?.pagination ?? {
    page: 1,
    limit: LIMIT,
    total: 0,
    totalPages: 0,
    hasMore: false,
  };
  const chartData = listData?.chartData;
  const chartDataPriorYear = listData?.chartDataPriorYear;

  const summary = useMemo(
    () => computeReportsPageSummary(chartData, chartDataPriorYear),
    [chartData, chartDataPriorYear]
  );

  const { data: eventsData, isLoading: isLoadingEvents } = useEvents({
    status: "completed_archived",
    pageSize: 200,
  });
  const eventOptions = eventsData?.events ?? [];

  const { data: venuesResponse, isLoading: isLoadingVenues } = useVenues({
    status: "active",
    pageSize: 500,
  });
  const venueOptions = venuesResponse?.data ?? [];

  const { data: userOptions = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["reports", "users"],
    queryFn: fetchReportUsers,
    staleTime: 5 * 60 * 1000,
  });

  const { data: djOptions = [], isLoading: isLoadingDjs } = useActiveDjs();

  const handleApply = () => {
    setAppliedFilters(filters);
    setPage(1);
    if (isMobile) {
      setFiltersOpen(false);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  const fetchAllReportsForExport = useCallback(async () => {
    const total = pagination.total;
    if (total === 0) return [];
    const limit = Math.min(total, 10000);
    const { reports: allReports } = await reportsClientService.listApprovedReports({
      page: 1,
      limit,
      eventId: appliedFilters.eventId,
      venueId: appliedFilters.venueId,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      userId: appliedFilters.userId,
      djId: appliedFilters.djId,
      chart: false,
    });
    return allReports;
  }, [appliedFilters, pagination.total]);

  const hasActiveFilters =
    appliedFilters.eventId ||
    appliedFilters.venueId ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo ||
    appliedFilters.userId ||
    appliedFilters.djId;

  const filtersContent = (
    <ReportsFilters
      filters={filters}
      onFiltersChange={setFilters}
      onApply={handleApply}
      eventOptions={eventOptions}
      venueOptions={venueOptions}
      userOptions={userOptions}
      djOptions={djOptions}
      isLoadingEvents={isLoadingEvents}
      isLoadingVenues={isLoadingVenues}
      isLoadingUsers={isLoadingUsers}
      isLoadingDjs={isLoadingDjs}
    />
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {reportsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load reports</AlertTitle>
          <AlertDescription>{(reportsError as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* Mobile Filter Button */}
      {isMobile && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  •
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0 overflow-y-auto">
            <div className="p-4">{filtersContent}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Filters */}
      {!isMobile && filtersContent}

      {/* KPI row: Total Revenue, Total Events, Avg Revenue per Event, Revenue per Guest, Best Month */}
      <ReportsPageKPIRow summary={summary} isLoading={isLoadingReports} />

      {/* Charts: multi-line 2/3 width, donut 1/3 width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ReportsMultiLineChart data={chartData} isLoading={isLoadingReports} />
        </div>
        <div className="lg:col-span-1">
          <ReportsPageRevenueBreakdown data={chartData} isLoading={isLoadingReports} />
        </div>
      </div>

      {/* Detailed sortable table */}
      <ReportsTable
        reports={reports}
        isLoading={isLoadingReports}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        hasMore={pagination.hasMore}
        onPageChange={handlePageChange}
        onExportCsvRequest={fetchAllReportsForExport}
      />

      {/* Page empty state when no reports at all */}
      {!isLoadingReports && reports.length === 0 && pagination.total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No approved reports</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            There are no approved reports for the selected filters. Try changing the date range or filters.
          </p>
        </div>
      )}
    </div>
  );
}
