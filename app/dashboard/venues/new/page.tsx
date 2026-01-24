"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { useLocationById } from "@/lib/hooks/use-locations-api";
import { VenueForm } from "@/components/venues/VenueForm";

export default function NewVenuePage() {
  // Get current user to pre-fill state and country
  const { data: user, isLoading: loadingUser } = useProfile();

  // Get country and state names from location IDs
  const { data: country } = useLocationById(user?.country_id || null);
  const { data: state } = useLocationById(user?.state_id || null);

  const countryName = country?.name || "United States";
  const stateName = state?.name || "";

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

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/venues">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Venues
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Venue</h1>
        <p className="text-muted-foreground mt-2">Fill in the venue information step by step</p>
      </div>

      <VenueForm
        mode="create"
        defaultState={stateName}
        defaultCountry={countryName}
        defaultCountryId={user.country_id}
        defaultStateId={user.state_id || undefined}
      />
    </div>
  );
}
