"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DJForm } from "@/components/djs/DJForm";
import { useDj } from "@/lib/hooks/use-djs";
import { useProfile as useProfileData } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";

interface EditDJPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDJPage({ params }: EditDJPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: dj, isLoading, error } = useDj(id);
  const { data: profile } = useProfileData();

  if (isLoading) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-2xl">
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading DJ...</p>
        </div>
      </div>
    );
  }

  if (error || !dj) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-2xl">
        <div className="text-center py-12">
          <p className="text-destructive">DJ not found</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard/djs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DJs
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">{isGlobalDirector ? "Edit DJ" : "View DJ"}</h1>
          <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{dj.short_id}</span>
        </div>
        <p className="text-muted-foreground mt-2">{dj.name}</p>
      </div>
      <DJForm mode={isGlobalDirector ? "edit" : "view"} dj={dj} />
    </div>
  );
}
