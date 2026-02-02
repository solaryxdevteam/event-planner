"use client";

import { useState, useMemo } from "react";
import { useApprovedReportsList } from "@/lib/hooks/use-reports";
import { useEvents } from "@/lib/hooks/use-events";
import { useVenues } from "@/lib/hooks/use-venues";
import { ReportsFilters, type ReportsFiltersState } from "./ReportsFilters";
import { ReportsChart } from "./ReportsChart";
import { ReportsTable } from "./ReportsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const LIMIT = 10;

export function ReportsPageClient() {
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ReportsFiltersState>({
    eventId: null,
    venueId: null,
    dateFrom: null,
    dateTo: null,
    sortByNetProfit: null,
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
      sortByNetProfit: appliedFilters.sortByNetProfit,
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

  const { data: eventsData, isLoading: isLoadingEvents } = useEvents({
    status: "completed_archived",
    pageSize: 200,
  });
  const eventOptions = eventsData ?? [];

  const { data: venuesResponse, isLoading: isLoadingVenues } = useVenues({
    status: "active",
    pageSize: 500,
  });
  const venueOptions = venuesResponse?.data ?? [];

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

  const hasActiveFilters =
    appliedFilters.eventId ||
    appliedFilters.venueId ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo ||
    appliedFilters.sortByNetProfit;

  const filtersContent = (
    <ReportsFilters
      filters={filters}
      onFiltersChange={setFilters}
      onApply={handleApply}
      eventOptions={eventOptions}
      venueOptions={venueOptions}
      isLoadingEvents={isLoadingEvents}
      isLoadingVenues={isLoadingVenues}
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

      {/* 2. Chart */}
      <ReportsChart data={chartData} isLoading={isLoadingReports} />

      {/* 3. Table (includes empty state when no reports) */}
      <ReportsTable
        reports={reports}
        isLoading={isLoadingReports}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        hasMore={pagination.hasMore}
        onPageChange={handlePageChange}
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
