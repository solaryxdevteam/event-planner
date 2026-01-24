/**
 * User Management Page
 *
 * Global Director only - manage all users in the system
 * Server Component that fetches users and displays management UI
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
import { UserManagementClient } from "@/components/users/UserManagementClient";
import { ForbiddenError, UnauthorizedError } from "@/lib/utils/errors";

export default async function UsersPage() {
  // Authentication is handled by layout.tsx via requireAuth()
  // Check user role first - redirect event_planner users immediately
  const { getServerUser } = await import("@/lib/auth/server");
  const user = await getServerUser();
  
  // Redirect event_planner users to dashboard
  if (user?.dbUser.role === "event_planner") {
    redirect("/dashboard");
  }

  // requireRole will throw ForbiddenError if user doesn't have the role
  // or UnauthorizedError if not authenticated
  // We catch both and handle them appropriately
  let hasAccess = false;
  let accessError: Error | null = null;

  try {
    await requireRole(["global_director"]);
    hasAccess = true;
  } catch (error) {
    accessError = error instanceof Error ? error : new Error(String(error));
  }

  // Handle errors before rendering JSX
  if (accessError) {
    // Handle UnauthorizedError - redirect to login
    if (accessError instanceof UnauthorizedError) {
      redirect("/auth/login");
    }

    // Handle ForbiddenError from requireRole
    if (accessError instanceof ForbiddenError) {
      return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-8">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-8 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need to be a Global Director to access the User Management page.
            </p>
            <p className="text-sm text-muted-foreground">{accessError.message}</p>
          </div>
        </div>
      );
    }

    // Handle network/timeout errors
    if (
      accessError.message.includes("timeout") ||
      accessError.message.includes("fetch failed") ||
      accessError.message.includes("Connect Timeout")
    ) {
      return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-8">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-8 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Connection Error</h2>
            <p className="text-muted-foreground mb-4">
              Unable to connect to the server. Please check your internet connection and try again.
            </p>
            <p className="text-sm text-muted-foreground">{accessError.message}</p>
          </div>
        </div>
      );
    }

    // Re-throw other errors
    throw accessError;
  }

  // Users are now fetched dynamically by UserManagementClient with pagination
  if (hasAccess) {
    return (
      <Suspense fallback={<div>Loading users...</div>}>
        <UserManagementClient />
      </Suspense>
    );
  }

  // Fallback (should not reach here)
  return null;
}
