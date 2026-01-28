"use client";

export const dynamic = "force-dynamic";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVenueByShortId } from "@/lib/hooks/use-venues";
import { VenueForm } from "@/components/venues/VenueForm";
import { DeleteVenueDialog } from "@/components/venues/DeleteVenueDialog";
import { BanVenueDialog } from "@/components/venues/BanVenueDialog";
import { UnbanVenueDialog } from "@/components/venues/UnbanVenueDialog";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { BanIcon, TrashIcon, CheckCircle2 } from "lucide-react";

interface EditVenuePageProps {
  params: Promise<{ id: string }>;
}

export default function EditVenuePage({ params }: EditVenuePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const shortId = resolvedParams.id;

  // All hooks must be called before any conditional returns
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);

  // Fetch venue using React Query
  const { data: venue, isLoading: loading, error } = useVenueByShortId(shortId);

  // Get user profile for role check
  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;
  const isEventPlanner = profile?.role === UserRole.EVENT_PLANNER;
  const canDelete = isGlobalDirector || isEventPlanner;
  const canEditVenue = isGlobalDirector || isEventPlanner;

  if (loading) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">Venue not found</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to edit venues
  if (!canEditVenue) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive text-lg font-semibold mb-2">Access Denied</p>
            <p className="text-muted-foreground mb-4">Only Event Planners and Global Directors can edit venues.</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/venues">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Venues
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDeleteSuccess = () => {
    router.push("/dashboard/venues");
  };

  const handleBanSuccess = () => {
    router.push("/dashboard/venues");
  };

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/venues">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Venues
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
              {venue.short_id && (
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {venue.short_id}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-2">Update the venue information step by step</p>
          </div>
        </div>
      </div>

      <VenueForm
        mode="edit"
        venue={venue}
        defaultState={venue.state || ""}
        defaultCountry={venue.country || "United States"}
        defaultCountryId={venue.country_id || undefined}
        defaultStateId={venue.state_id || undefined}
      />

      {/* Delete and Ban Actions */}
      <div className="mt-6 pt-6 border-t flex gap-2 justify-end">
        {isGlobalDirector && !venue.is_active && (
          <Button variant="default" onClick={() => setUnbanDialogOpen(true)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Unban Venue
          </Button>
        )}
        {isGlobalDirector && venue.is_active && (
          <Button variant="destructive" onClick={() => setBanDialogOpen(true)}>
            <BanIcon className="mr-2 h-4 w-4" />
            Ban Venue
          </Button>
        )}
        {canDelete && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete Venue
          </Button>
        )}
      </div>

      {/* Delete Dialog */}
      <DeleteVenueDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        venue={venue}
        onSuccess={handleDeleteSuccess}
      />

      {/* Ban Dialog */}
      {isGlobalDirector && venue.is_active && (
        <BanVenueDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          venue={venue}
          onSuccess={handleBanSuccess}
        />
      )}

      {/* Unban Dialog */}
      {isGlobalDirector && !venue.is_active && (
        <UnbanVenueDialog
          open={unbanDialogOpen}
          onOpenChange={setUnbanDialogOpen}
          venue={venue}
          onSuccess={() => {
            // React Query will automatically refetch
          }}
        />
      )}
    </div>
  );
}
