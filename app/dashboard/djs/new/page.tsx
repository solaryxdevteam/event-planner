"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DJForm } from "@/components/djs/DJForm";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";

export default function NewDJPage() {
  const router = useRouter();
  const { data: user, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-2xl">
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-2xl">
        <div className="flex justify-center py-12">
          <p className="text-destructive">Unable to load profile</p>
        </div>
      </div>
    );
  }

  const isGlobalDirector = user.role === UserRole.GLOBAL_DIRECTOR;
  if (!isGlobalDirector) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-2xl">
        <div className="text-center py-12">
          <p className="text-destructive text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-muted-foreground mb-4">Only Global Directors can add DJs.</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/djs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DJs
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add DJ</h1>
        <p className="text-muted-foreground mt-2">
          Add a new DJ to the roster. They will receive an email notification.
        </p>
      </div>
      <DJForm mode="create" />
    </div>
  );
}
