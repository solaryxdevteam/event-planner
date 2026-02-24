"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventList } from "@/components/events/EventList";
import { EventFilters, type EventFilters as EventFiltersType } from "@/components/events/EventFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents, type EventFilters as EventFiltersHook } from "@/lib/hooks/use-events";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const tabFromUrl = searchParams.get("tab") || "current";
  // Local tab state so switching is instant; URL updates in background
  const [selectedTab, setSelectedTab] = useState(tabFromUrl);
  // Per-tab page so each tab keeps its own page when switching
  const [pageByTab, setPageByTab] = useState<Record<string, number>>({ current: 1, past: 1, cancelled: 1 });
  const currentPage = pageByTab[selectedTab] ?? 1;
  const isMarketingManager = profile?.role === UserRole.MARKETING_MANAGER;
  const [pageSize] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Initialize filters from URL params if present
  const [filters, setFilters] = useState<EventFiltersType>(() => {
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    return {
      search: "",
      status: "all",
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      creatorId: null,
      venueId: null,
      state: "all",
    };
  });

  // Sync selected tab from URL (e.g. back/forward, bookmark)
  useEffect(() => {
    setSelectedTab(tabFromUrl);
  }, [tabFromUrl]);

  // Update filters when URL params change
  useEffect(() => {
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    // Use startTransition to make state update non-blocking and avoid synchronous setState in effect
    startTransition(() => {
      setFilters((prev) => {
        // Only update if values actually changed
        if (prev.dateFrom === (dateFrom || null) && prev.dateTo === (dateTo || null)) {
          return prev;
        }
        return {
          ...prev,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        };
      });
    });
  }, [searchParams]);

  // Fetch all events for filter options (creators, venues)
  const { data: allEventsData } = useEvents({
    page: 1,
    pageSize: 1000, // Get all for filter options
  });

  const allEvents = useMemo(() => allEventsData?.events ?? [], [allEventsData]);

  // Get unique creators from events
  const availableCreators = useMemo(() => {
    const creatorMap = new Map<string, { id: string; name: string }>();
    allEvents.forEach((event) => {
      if (event.creator && !creatorMap.has(event.creator.id)) {
        creatorMap.set(event.creator.id, {
          id: event.creator.id,
          name: event.creator.name,
        });
      }
    });
    return Array.from(creatorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEvents]);

  // Get unique venues from events
  const availableVenues = useMemo(() => {
    const venueMap = new Map<string, { id: string; name: string }>();
    allEvents.forEach((event) => {
      if (event.venue && !venueMap.has(event.venue.id)) {
        venueMap.set(event.venue.id, {
          id: event.venue.id,
          name: event.venue.name,
        });
      }
    });
    return Array.from(venueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEvents]);

  // State filter disabled: venue.state was removed from schema (migration 025)
  const availableStates = useMemo(() => [], []);

  // Prepare filters for API call
  const eventFilters: EventFiltersHook = useMemo(() => {
    // Determine status filter based on tab
    const getStatusFilter = (): string | string[] => {
      if (filters.status !== "all") {
        return filters.status;
      }

      // Default status filters based on tab
      switch (selectedTab) {
        case "current":
          return "approved_scheduled";
        case "past":
          return ["completed_awaiting_report", "completed_archived"];
        case "cancelled":
          return ["cancelled", "rejected"];
        default:
          return "approved_scheduled";
      }
    };

    const statusFilter = getStatusFilter();
    const baseFilters: EventFiltersHook = {
      search: filters.search || undefined,
      status: statusFilter,
      creatorId: filters.creatorId || undefined,
      venueId: filters.venueId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      state: filters.state && filters.state !== "all" ? filters.state : undefined,
      page: currentPage,
      pageSize,
    };

    // If user selected a specific status, use it instead of tab default
    if (filters.status !== "all") {
      baseFilters.status = filters.status;
    }

    return baseFilters;
  }, [filters, currentPage, pageSize, selectedTab]);

  // Fetch filtered events
  const { data: eventsResponse, isLoading } = useEvents(eventFilters);
  const events = eventsResponse?.events ?? [];
  const pagination = eventsResponse?.pagination ?? {
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  };

  // Scroll to top when filters or page changes
  useEffect(() => {
    const eventsContent = document.querySelector("[data-events-content]");
    if (eventsContent) {
      eventsContent.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [filters, currentPage, selectedTab]);

  const handleView = (eventShortId: string) => {
    router.push(`/dashboard/events/${eventShortId}`);
  };

  const handleFiltersChange = (newFilters: EventFiltersType) => {
    setFilters(newFilters);
    setPageByTab((prev) => ({ ...prev, [selectedTab]: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPageByTab((prev) => ({ ...prev, [selectedTab]: page }));
  };

  // Calculate totals for tabs
  const currentCount = useMemo(() => {
    return allEvents.filter((e) => e.status === "approved_scheduled").length;
  }, [allEvents]);

  const pastCount = useMemo(() => {
    return allEvents.filter((e) => e.status === "completed_awaiting_report" || e.status === "completed_archived")
      .length;
  }, [allEvents]);

  const cancelledCount = useMemo(() => {
    return allEvents.filter((e) => e.status === "cancelled" || e.status === "rejected").length;
  }, [allEvents]);

  const tabCountBadgeClass =
    "bg-red-500 text-white rounded-full w-6.5 h-6 px-1 justify-center text-xs font-semibold border-0";

  const handleTabChange = (value: string) => {
    setSelectedTab(value); // Switch tab immediately, don't wait for URL/navigation
    setFilters((prev) => ({ ...prev, status: "all", state: "all" }));
    router.push(`/dashboard/events?tab=${value}`); // Update URL in background
  };

  const filtersContent = (
    <EventFilters
      filters={filters}
      onFiltersChange={(newFilters) => {
        handleFiltersChange(newFilters);
        if (isMobile) {
          setFiltersOpen(false);
        }
      }}
      availableCreators={availableCreators}
      availableVenues={availableVenues}
      availableStates={availableStates}
    />
  );

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Filters (Desktop) */}
      <div className="flex-1 overflow-y-auto min-w-0" data-events-content>
        <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0">
                    {filtersContent}
                  </SheetContent>
                </Sheet>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events</h1>
                <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                  {pagination.total} {pagination.total === 1 ? "event" : "events"} found
                </p>
              </div>
            </div>
            {!isMarketingManager && (
              <Button onClick={() => router.push("/dashboard/events/requests/new")} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Event Request
              </Button>
            )}
          </div>

          {/* Tabs for Quick Status Filter - selectedTab updates instantly on click */}
          <Tabs value={selectedTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="h-12 p-1.5 border border-input/50 gap-1 overflow-x-auto scrollbar-hide w-full sm:w-fit inline-flex rounded-xl bg-muted/60">
              <TabsTrigger
                value="current"
                className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
              >
                <span>Current</span>
                {currentCount > 0 && <Badge className={tabCountBadgeClass}>{currentCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
              >
                <span>Past</span>
                {pastCount > 0 && <Badge className={tabCountBadgeClass}>{pastCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="px-2 py-2.5 h-full text-sm font-medium gap-2 rounded-lg data-[state=active]:shadow-sm"
              >
                <span>Cancelled/Rejected</span>
                {cancelledCount > 0 && <Badge className={tabCountBadgeClass}>{cancelledCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Loading State - Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <>
              <EventList
                events={events}
                onView={handleView}
                showActions={false}
                emptyMessage={
                  selectedTab === "current"
                    ? "No current events"
                    : selectedTab === "past"
                      ? "No past events"
                      : "No cancelled or rejected events"
                }
              />
              {/* Pagination - one per tab */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline sm:ml-1">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                      const showPage =
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.page - 1 && page <= pagination.page + 1);
                      if (!showPage) {
                        const prevPage = page - 1;
                        const nextPage = page + 1;
                        if (
                          (prevPage === 1 || prevPage === pagination.page - 2) &&
                          (nextPage === pagination.totalPages || nextPage === pagination.page + 2)
                        ) {
                          return (
                            <span key={page} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                      return (
                        <Button
                          key={page}
                          variant={pagination.page === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="min-w-[2.5rem]"
                          aria-label={`Go to page ${page}`}
                          aria-current={pagination.page === page ? "page" : undefined}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline sm:mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Right Content - Events */}

      {!isMobile && <div className="hidden md:block w-80 shrink-0 border-l">{filtersContent}</div>}
    </div>
  );
}
