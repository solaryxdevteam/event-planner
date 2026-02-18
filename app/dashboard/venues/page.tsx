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
import { UserRole } from "@/lib/types/roles";

export default function VenuesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);
  const [filters, setFilters] = useState<VenueFiltersType>({
    search: "",
    status: "all",
    totalCapacityMin: null,
    totalCapacityMax: null,
    numberOfTablesMin: null,
    numberOfTablesMax: null,
    ticketCapacityMin: null,
    ticketCapacityMax: null,
  });

  // Get user profile for role
  const { data: profile } = useProfile();
  const userRole = profile?.role || "event_planner";
  const canCreateVenue = profile?.role === UserRole.EVENT_PLANNER || profile?.role === UserRole.GLOBAL_DIRECTOR;
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  // Prepare filters for API call (only search + status used in UI; capacity filters commented out)
  const venueFilters: VenueFiltersHook = useMemo(
    () => ({
      search: filters.search || undefined,
      status: filters.status,
      totalCapacityMin: filters.totalCapacityMin ?? undefined,
      totalCapacityMax: filters.totalCapacityMax ?? undefined,
      numberOfTablesMin: filters.numberOfTablesMin ?? undefined,
      numberOfTablesMax: filters.numberOfTablesMax ?? undefined,
      ticketCapacityMin: filters.ticketCapacityMin ?? undefined,
      ticketCapacityMax: filters.ticketCapacityMax ?? undefined,
      page: currentPage,
      pageSize,
    }),
    [filters, currentPage, pageSize]
  );

  // Fetch filtered venues
  const { data: venuesData, isLoading } = useVenues(venueFilters);

  const venues = venuesData?.data || [];
  const totalVenues = venuesData?.total || 0;
  const totalPages = venuesData?.totalPages || 1;

  // Scroll to top when filters or page changes
  useEffect(() => {
    const venuesContent = document.querySelector("[data-venues-content]");
    if (venuesContent) {
      venuesContent.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [filters, currentPage]);

  const handleDelete = async () => {
    // Kept for backward compatibility; dialogs handle deletion, React Query refetches
  };

  const handleBan = async () => {
    // Kept for backward compatibility; dialogs handle banning, React Query refetches
  };

  const handleFiltersChange = (newFilters: VenueFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto min-w-0" data-venues-content>
        <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 max-w-7xl">
          {/* Title and Add Venue */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Venues</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                {totalVenues} {totalVenues === 1 ? "venue" : "venues"} found
              </p>
            </div>
            {canCreateVenue && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/venues/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Venue
                </Link>
              </Button>
            )}
          </div>

          {/* Filters header: search + status (below title) */}
          <div className="mb-6 sm:mb-8">
            <VenueFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              maxTotalCapacity={10000}
              maxNumberOfTables={500}
              maxTicketCapacity={10000}
            />
          </div>

          {/* Loading State - Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <VenueList
              venues={venues}
              onDelete={handleDelete}
              onBan={isGlobalDirector ? handleBan : undefined}
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
