"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DJForm } from "@/components/djs/DJForm";
import { useDj } from "@/lib/hooks/use-djs";
import { useProfile as useProfileData } from "@/lib/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@/lib/types/roles";
import { toast } from "sonner";

interface EditDJPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDJPage({ params }: EditDJPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: dj, isLoading, error } = useDj(id);
  const { data: profile } = useProfileData();
  const queryClient = useQueryClient();
  const [isSendingVerification, setIsSendingVerification] = useState(false);

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
          {dj.email_verified && (
            <Badge variant="secondary" className="py-1 rounded-sm text-sm gap-1.5 font-normal">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              Email verified
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">{dj.name}</p>
      </div>
      <DJForm mode={isGlobalDirector ? "edit" : "view"} dj={dj} />

      {/* Send verification email */}
      {isGlobalDirector && dj.email && !dj.email_verified && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">DJ email verification</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Send a verification email to {dj.email}. The DJ can open the link and enter the code to be marked as
            verified.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isSendingVerification}
            onClick={async () => {
              setIsSendingVerification(true);
              try {
                const res = await fetch(`/api/djs/${dj.short_id}/send-verification`, { method: "POST" });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || "Failed to send");
                }
                toast.success("Verification email sent. The DJ will receive a link and code to verify.");
                await queryClient.invalidateQueries({ queryKey: ["dj", dj.short_id] });
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to send verification email");
              } finally {
                setIsSendingVerification(false);
              }
            }}
          >
            {isSendingVerification ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Sending...
              </>
            ) : (
              "Send verification email"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
