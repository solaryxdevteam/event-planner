"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, CheckSquare, Building2, Users, User, CalendarCheck } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    first_name: string;
    last_name?: string | null;
    email: string;
    avatar?: string | null;
  };
  disabled?: boolean;
  userRole?: string;
}

export function AppSidebar({ user, disabled = false, userRole, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  // Default user data if not provided
  const userData = user || {
    first_name: "User",
    last_name: null,
    email: "user@example.com",
    avatar: null,
  };

  // Base navigation items
  const baseNavMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Events",
      url: "/dashboard/events",
      icon: Calendar,
    },
    {
      title: "Approvals",
      url: "/dashboard/approvals",
      icon: CheckSquare,
    },
    {
      title: "Venue Management",
      url: "/dashboard/venues",
      icon: Building2,
    },
    {
      title: "User Management",
      url: "/dashboard/users",
      icon: Users,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
  ];

  // Filter out User Management for event_planner role
  const filteredNavMain = baseNavMain.filter((item) => {
    if (item.title === "User Management" && userRole === "event_planner") {
      return false;
    }
    return true;
  });

  // Map navigation items with active state based on current pathname
  // If disabled (pending user), only enable Profile
  const navMain = filteredNavMain.map((item) => {
    const isProfile = item.url === "/dashboard/profile";
    const itemDisabled = disabled && !isProfile;

    // For dashboard, match exactly
    if (item.url === "/dashboard") {
      return {
        ...item,
        isActive: pathname === "/dashboard",
        disabled: itemDisabled,
      };
    }
    // For other routes, check if pathname starts with the item URL
    return {
      ...item,
      isActive: pathname.startsWith(item.url),
      disabled: itemDisabled,
    };
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild={!disabled} disabled={disabled}>
              {disabled ? (
                <>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <CalendarCheck className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Event Planner</span>
                    <span className="truncate text-xs">Management System</span>
                  </div>
                </>
              ) : (
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <CalendarCheck className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Event Planner</span>
                    <span className="truncate text-xs">Management System</span>
                  </div>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} disabled={disabled} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            avatar: userData.avatar || undefined,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
