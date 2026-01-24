import { requireAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardLayoutWrapper } from "@/components/dashboard-layout-wrapper";
import { UnauthorizedError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/**
 * Dashboard Layout
 * Protected route - requires authentication
 * Allows pending users to access (for pending page)
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Require authentication - allow pending users for pending page
  let user;
  try {
    user = await requireAuth(true);
  } catch (error) {
    // If user is not authenticated, redirect to login instead of showing error
    if (error instanceof UnauthorizedError) {
      redirect("/auth/login");
    }
    // Re-throw other errors
    throw error;
  }

  // If user is inactive, redirect to login
  if (user.dbUser.status === "inactive") {
    redirect("/auth/login");
  }

  // Note: Pending user redirects are handled by middleware and client-side PendingRedirect component

  // Prepare user data for sidebar
  const userData = {
    first_name: user.dbUser.first_name,
    last_name: user.dbUser.last_name,
    email: user.dbUser.email,
    avatar: user.dbUser.avatar_url,
    role: user.dbUser.role,
  };

  const isPending = user.dbUser.status === "pending";

  return (
    <DashboardLayoutWrapper user={userData} isPending={isPending}>
      {children}
    </DashboardLayoutWrapper>
  );
}
