/**
 * Protected Content Component
 * Example component that shows/hides content based on user role
 */

"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types/database.types";

interface ProtectedContentProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  minimumRole?: Role;
  fallback?: React.ReactNode;
}

/**
 * Client-side role-based content protection
 * Note: This is for UI only. Always enforce permissions on the server!
 */
export function ProtectedContent({ children, allowedRoles, minimumRole, fallback }: ProtectedContentProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        const supabaseUser = await getCurrentUser();
        if (!supabaseUser) {
          setHasAccess(false);
          return;
        }

        // Get user from database
        const supabase = getSupabaseClient();
        const { data: dbUser } = await supabase.from("users").select("*").eq("id", supabaseUser.id).single();

        if (!dbUser) {
          setHasAccess(false);
          return;
        }

        // Check allowed roles
        if (allowedRoles && allowedRoles.length > 0) {
          setHasAccess(allowedRoles.includes(dbUser.role));
          return;
        }

        // Check minimum role
        if (minimumRole) {
          const roleHierarchy: Record<Role, number> = {
            event_planner: 1,
            city_curator: 2,
            regional_curator: 3,
            lead_curator: 4,
            global_director: 5,
          };

          const userRoleLevel = roleHierarchy[dbUser.role];
          const minimumRoleLevel = roleHierarchy[minimumRole];
          setHasAccess(userRoleLevel >= minimumRoleLevel);
          return;
        }

        // No restrictions, user is authenticated
        setHasAccess(true);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [allowedRoles, minimumRole]);

  if (isLoading) {
    return fallback || null;
  }

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Example usage:
 *
 * // Show content only to curators
 * <ProtectedContent allowedRoles={['city_curator', 'regional_curator']}>
 *   <AdminPanel />
 * </ProtectedContent>
 *
 * // Show content to regional curator and above
 * <ProtectedContent minimumRole="regional_curator">
 *   <ManagerDashboard />
 * </ProtectedContent>
 *
 * // Show fallback for unauthorized users
 * <ProtectedContent minimumRole="city_curator" fallback={<p>Access denied</p>}>
 *   <SecretContent />
 * </ProtectedContent>
 */
