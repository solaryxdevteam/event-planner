import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";

// This page depends on authenticated user state (Supabase cookies), so it must be dynamic.
export const dynamic = "force-dynamic";

/**
 * Main Page
 * Redirects based on authentication status:
 * - Not authenticated → /auth/login
 * - Authenticated → /dashboard
 */
export default async function Home() {
  const user = await getServerUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check user status
  if (user.dbUser.status !== "active") {
    if (user.dbUser.status === "pending") {
      redirect("/dashboard/pending");
    }
    // Inactive users also redirected to login
    redirect("/auth/login");
  }

  // Authenticated and active user → redirect to dashboard
  redirect("/dashboard");
}
