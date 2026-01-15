"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VenueTable } from "@/components/venues/VenueTable";
import { VenueFormDialog } from "@/components/venues/VenueFormDialog";
import { getVenues, createVenue, updateVenue, deleteVenue, banVenue } from "@/lib/actions/venues";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { CreateVenueInput } from "@/lib/validation/venues.schema";
import { PlusIcon, SearchIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueWithCreator[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<VenueWithCreator[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueWithCreator | undefined>();
  const [userRole, setUserRole] = useState<string>("event_planner");

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    // Filter venues based on search query
    if (searchQuery.trim() === "") {
      setFilteredVenues(venues);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredVenues(
        venues.filter(
          (venue) =>
            venue.name.toLowerCase().includes(query) ||
            venue.city.toLowerCase().includes(query) ||
            venue.address.toLowerCase().includes(query) ||
            venue.creator.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, venues]);

  const loadVenues = async () => {
    setIsLoading(true);
    const result = await getVenues();

    if (result.success) {
      setVenues(result.data);
      setFilteredVenues(result.data);

      // Get user role from first venue's creator (temporary until we have a proper user context)
      // In production, you'd get this from a user context or session
      if (result.data.length > 0) {
        // This is a simplified approach - in reality, you'd fetch the current user's role
        setUserRole("event_planner"); // Default for demo
      }
    } else {
      toast.error("Failed to load venues", {
        description: result.error,
      });
    }

    setIsLoading(false);
  };

  const handleCreate = () => {
    setEditingVenue(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (venue: VenueWithCreator) => {
    setEditingVenue(venue);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: CreateVenueInput) => {
    setIsSubmitting(true);

    try {
      if (editingVenue) {
        // Update existing venue
        const result = await updateVenue(editingVenue.id, data);

        if (result.success) {
          toast.success("Venue updated successfully");
          await loadVenues();
          setIsFormOpen(false);
        } else {
          toast.error("Failed to update venue", {
            description: result.error,
          });
        }
      } else {
        // Create new venue
        const result = await createVenue(data);

        if (result.success) {
          if (result.data.isDuplicate) {
            // Show duplicate warning
            toast.warning("Duplicate venue detected", {
              description:
                "A venue with the same name, address, and city already exists. Please check if you want to create a duplicate.",
            });
          } else {
            toast.success("Venue created successfully");
            await loadVenues();
            setIsFormOpen(false);
          }
        } else {
          toast.error("Failed to create venue", {
            description: result.error,
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (venueId: string) => {
    if (!confirm("Are you sure you want to delete this venue? This action cannot be undone.")) {
      return;
    }

    const result = await deleteVenue(venueId);

    if (result.success) {
      toast.success("Venue deleted successfully");
      await loadVenues();
    } else {
      toast.error("Failed to delete venue", {
        description: result.error,
      });
    }
  };

  const handleBan = async (venueId: string) => {
    const reason = prompt("Please provide a reason for banning this venue:");

    if (!reason) {
      return;
    }

    const result = await banVenue(venueId, reason);

    if (result.success) {
      toast.success("Venue banned successfully");
      await loadVenues();
    } else {
      toast.error("Failed to ban venue", {
        description: result.error,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
          <p className="text-muted-foreground mt-2">Manage event venues and locations</p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Venue
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search venues by name, city, address, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Venues</div>
          <div className="text-2xl font-bold mt-1">{venues.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Displayed</div>
          <div className="text-2xl font-bold mt-1">{filteredVenues.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Capacity</div>
          <div className="text-2xl font-bold mt-1">
            {venues.reduce((sum, v) => sum + (v.capacity || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <VenueTable
          venues={filteredVenues}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBan={handleBan}
          userRole={userRole}
        />
      )}

      {/* Form Dialog */}
      <VenueFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        venue={editingVenue}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
