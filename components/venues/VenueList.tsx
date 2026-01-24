"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VenueCard } from "./VenueCard";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface VenueListProps {
  venues: VenueWithCreator[];
  onDelete: (venueId: string) => void;
  onBan?: (venueId: string) => void;
  userRole: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function VenueList({
  venues,
  onDelete,
  onBan,
  userRole,
  currentPage,
  totalPages,
  onPageChange,
}: VenueListProps) {
  if (venues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No venues found</p>
        <p className="text-sm mt-2">Create your first venue to get started</p>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    onPageChange(page);
    // Scroll to top of the list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} onDelete={onDelete} onBan={onBan} userRole={userRole} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-1">Previous</span>
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage) {
                // Show ellipsis
                const prevPage = page - 1;
                const nextPage = page + 1;
                if (
                  (prevPage === 1 || prevPage === currentPage - 2) &&
                  (nextPage === totalPages || nextPage === currentPage + 2)
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
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="min-w-[2.5rem]"
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline sm:mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
