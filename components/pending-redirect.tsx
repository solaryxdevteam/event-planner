"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface PendingRedirectProps {
  isPending: boolean;
}

export function PendingRedirect({ isPending }: PendingRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect pending users to profile page if they're not already there
    if (isPending && !pathname.startsWith("/dashboard/profile")) {
      router.replace("/dashboard/profile");
    }
  }, [isPending, pathname, router]);

  return null;
}
