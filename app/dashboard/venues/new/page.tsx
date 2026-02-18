"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { useLocationById } from "@/lib/hooks/use-locations-api";
import { VenueForm } from "@/components/venues/VenueForm";
import { UserRole } from "@/lib/types/roles";

export default function NewVenuePage() {
  const router = useRouter();
  const { data: user, isLoading: loadingUser } = useProfile();
  const { data: country } = useLocationById(user?.country_id || null);
  const countryName = country?.name || "United States";

  if (loadingUser) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">Unable to load user profile</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to create venues
  const canCreateVenue = user.role === UserRole.EVENT_PLANNER || user.role === UserRole.GLOBAL_DIRECTOR;

  if (!canCreateVenue) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive text-lg font-semibold mb-2">Access Denied</p>
            <p className="text-muted-foreground mb-4">Only Event Planners and Global Directors can create venues.</p>
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

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Venue</h1>
        <p className="text-muted-foreground mt-2">Fill in the venue information step by step</p>
      </div>

      <VenueForm mode="create" defaultCountry={countryName} defaultCountryId={user.country_id} />
    </div>
  );
}
