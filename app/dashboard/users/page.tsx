/**
 * User Management Page
 *
 * All roles except Event Planner can view this page.
 * - Global Director: sees all users and has action buttons (Add User, Create Invitation, Edit, etc.).
 * - Other roles: see only their pyramid (self + subordinates) with no action buttons.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
import { UserManagementClient } from "@/components/users/UserManagementClient";

export default async function UsersPage() {
  const user = await requireAuth(true);
  if (!user) {
    redirect("/auth/login");
  }

  // Only event_planner cannot see this page
  if (user.dbUser.role === "event_planner") {
    redirect("/dashboard");
  }

  const isGlobalDirector = user.dbUser.role === "global_director";

  return (
    <Suspense fallback={<div>Loading users...</div>}>
      <UserManagementClient isGlobalDirector={isGlobalDirector} />
    </Suspense>
  );
}
