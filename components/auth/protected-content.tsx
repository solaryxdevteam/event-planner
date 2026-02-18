/**
 * Protected Content Component
 * Example component that shows/hides content based on user role
 */

"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

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
        const { data: dbUser, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("id", supabaseUser.id)
          .single();

        if (dbError || !dbUser) {
          setHasAccess(false);
          return;
        }

        // Type assertion for dbUser
        const userData = dbUser as { role: Role; [key: string]: unknown };

        // Check allowed roles
        if (allowedRoles && allowedRoles.length > 0) {
          setHasAccess(allowedRoles.includes(userData.role));
          return;
        }

        // Check minimum role
        if (minimumRole) {
          const roleHierarchy: Record<Role, number> = {
            [UserRole.EVENT_PLANNER]: 1,
            [UserRole.CITY_CURATOR]: 2,
            [UserRole.MARKETING_MANAGER]: 2,
            [UserRole.REGIONAL_CURATOR]: 3,
            [UserRole.LEAD_CURATOR]: 4,
            [UserRole.GLOBAL_DIRECTOR]: 5,
          };

          const userRole = userData.role;
          const userRoleLevel = roleHierarchy[userRole];
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
