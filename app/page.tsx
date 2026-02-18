"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root Page
 * Middleware handles all redirects for the root path.
 * This
 *  is a client-side fallback redirect in case middleware doesn't run.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Fallback redirect - middleware  should handle this before reaching here
    router.push("/auth/login");
  }, [router]);

  // Return null or a loading state since redirect happens immediately
  return null;
}
