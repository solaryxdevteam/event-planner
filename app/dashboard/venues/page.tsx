"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VenueList } from "@/components/venues/VenueList";
import { VenueFilters, type VenueFilters as VenueFiltersType } from "@/components/venues/VenueFilters";
import { VenueCardSkeleton } from "@/components/venues/VenueCardSkeleton";
import { useVenues, type VenueFilters as VenueFiltersHook } from "@/lib/hooks/use-venues";
import { useProfile } from "@/lib/hooks/use-profile";
import { PlusIcon } from "lucide-react";

export default function VenuesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);
  const [filters, setFilters] = useState<VenueFiltersType>({
    search: "",
    state: "all",
    status: "all",
    specs: [],
    dateFrom: null,
    dateTo: null,
    standingMin: null,
    standingMax: null,
    seatedMin: null,
    seatedMax: null,
  });

  // Get user profile for role
  const { data: profile } = useProfile();
  const userRole = profile?.role || "event_planner";

  // Prepare filters for API call
  const venueFilters: VenueFiltersHook = useMemo(
    () => ({
      search: filters.search || undefined,
      state: filters.state === "all" ? null : filters.state || null,
      status: filters.status,
      specs: filters.specs.length > 0 ? filters.specs : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      standingMin: filters.standingMin ?? undefined,
      standingMax: filters.standingMax ?? undefined,
      seatedMin: filters.seatedMin ?? undefined,
      seatedMax: filters.seatedMax ?? undefined,
      page: currentPage,
      pageSize,
    }),
    [filters, currentPage, pageSize]
  );

  // Fetch filtered venues
  const { data: venuesData, isLoading } = useVenues(venueFilters);

  // Fetch all venues for filter options (states, dates, capacities)
  const { data: allVenuesData } = useVenues({
    page: 1,
    pageSize: 1000, // Get all for states/dates/capacities
    status: "all",
  });

  const allVenues = allVenuesData?.data || [];
  const venues = venuesData?.data || [];
  const totalVenues = venuesData?.total || 0;
  const totalPages = venuesData?.totalPages || 1;

  // Get unique states from all venues
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    allVenues.forEach((venue) => {
      if (venue.state) {
        states.add(venue.state);
      }
    });
    return Array.from(states).sort();
  }, [allVenues]);

  // Get max date from all venues (min is 10 years ago)
  const { maxDate } = useMemo(() => {
    const dates: Date[] = [];
    allVenues.forEach((venue) => {
      if (venue.availability_start_date) {
        dates.push(new Date(venue.availability_start_date));
      }
      if (venue.availability_end_date) {
        dates.push(new Date(venue.availability_end_date));
      }
    });
    if (dates.length === 0) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return { maxDate: nextYear };
    }
    return {
      maxDate: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [allVenues]);

  // Get min/max capacities from all venues
  const { minStanding, maxStanding, minSeated, maxSeated } = useMemo(() => {
    const standingValues = allVenues
      .map((v) => v.capacity_standing)
      .filter((v): v is number => v !== null && v !== undefined);
    const seatedValues = allVenues
      .map((v) => v.capacity_seated)
      .filter((v): v is number => v !== null && v !== undefined);

    return {
      minStanding: standingValues.length > 0 ? Math.min(...standingValues) : 0,
      maxStanding: standingValues.length > 0 ? Math.max(...standingValues) : 1000000,
      minSeated: seatedValues.length > 0 ? Math.min(...seatedValues) : 0,
      maxSeated: seatedValues.length > 0 ? Math.max(...seatedValues) : 1000000,
    };
  }, [allVenues]);

  // Scroll to top when filters or page changes
  useEffect(() => {
    const venuesContent = document.querySelector("[data-venues-content]");
    if (venuesContent) {
      venuesContent.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [filters, currentPage]);

  const handleDelete = async (venueId: string) => {
    // This is kept for backward compatibility but dialogs handle deletion now
    // React Query will automatically refetch when mutations complete
  };

  const handleBan = async (venueId: string) => {
    // This is kept for backward compatibility but dialogs handle banning now
    // React Query will automatically refetch when mutations complete
  };

  const handleFiltersChange = (newFilters: VenueFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Filters */}
      <div className="w-80 shrink-0 border-r">
        <VenueFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableStates={availableStates}
          maxDate={maxDate}
          minStanding={minStanding}
          maxStanding={maxStanding}
          minSeated={minSeated}
          maxSeated={maxSeated}
        />
      </div>

      {/* Right Content - Venues */}
      <div className="flex-1 overflow-y-auto" data-venues-content>
        <div className="container mx-auto py-8 px-6 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
              <p className="text-muted-foreground mt-2">
                {totalVenues} {totalVenues === 1 ? "venue" : "venues"} found
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/venues/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Venue
              </Link>
            </Button>
          </div>

          {/* Loading State - Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <VenueList
              venues={venues}
              onDelete={handleDelete}
              onBan={handleBan}
              userRole={userRole}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
