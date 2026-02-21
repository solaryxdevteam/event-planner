"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CheckSquare,
  Building2,
  Users,
  User,
  FileText,
  Clock,
  BarChart3,
  HelpCircle,
  Disc3,
} from "lucide-react";

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

  // Check if user is curator or higher (can see approvals)
  const isCurator =
    userRole && ["city_curator", "regional_curator", "lead_curator", "global_director"].includes(userRole);

  // Check if user can create events (event planners)
  const canCreateEvents = userRole === "event_planner" || isCurator;

  // Base navigation items with nested structure
  const baseNavMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    // Calendar - for all users
    {
      title: "Calendar",
      url: "/dashboard/calendar",
      icon: CalendarDays,
    },

    // Events - for all users
    {
      title: "Events",
      url: "/dashboard/events?tab=current", // Default to first sub-item
      icon: Calendar,
      // items: [
      //   {
      //     title: "Current",
      //     url: "/dashboard/events?tab=current",
      //   },
      //   {
      //     title: "Past",
      //     url: "/dashboard/events?tab=past",
      //   },
      //   {
      //     title: "Cancelled/Rejected",
      //     url: "/dashboard/events?tab=cancelled",
      //   },
      // ],
    },
    // Event Requests - only for users who can create events
    ...(canCreateEvents
      ? [
          {
            title: "Event Requests",
            url: "/dashboard/events/requests?tab=in-review", // Default to first sub-item
            icon: FileText,
            // items: [
            //   {
            //     title: "Drafts",
            //     url: "/dashboard/events/requests?tab=drafts",
            //   },
            //   {
            //     title: "In Review",
            //     url: "/dashboard/events/requests?tab=in-review",
            //   },
            //   {
            //     title: "Rejected",
            //     url: "/dashboard/events/requests?tab=rejected",
            //   },
            // ],
          },
        ]
      : []),
    // Pending Approvals - only for curators and global
    ...(isCurator
      ? [
          {
            title: "Pending Approvals",
            url: "/dashboard/approvals?type=event", // Default to first sub-item
            icon: CheckSquare,
            // items: [
            //   {
            //     title: "Event Approvals",
            //     url: "/dashboard/approvals?type=event",
            //   },
            //   {
            //     title: "Modifications",
            //     url: "/dashboard/approvals?type=modification",
            //   },
            //   {
            //     title: "Cancellations",
            //     url: "/dashboard/approvals?type=cancellation",
            //   },
            //   {
            //     title: "Reports",
            //     url: "/dashboard/approvals?type=report",
            //   },
            //   {
            //     title: "Marketing Reports",
            //     url: "/dashboard/approvals?type=marketing_report",
            //   },
            //   {
            //     title: "Venues",
            //     url: "/dashboard/approvals?type=venues",
            //   },
            // ],
          },
        ]
      : []),
    // User Management - only for curators
    ...(isCurator
      ? [
          {
            title: "Users",
            url: "/dashboard/users",
            icon: Users,
          },
        ]
      : []),
    {
      title: "DJs",
      url: "/dashboard/djs",
      icon: Disc3,
    },
    {
      title: "Venues",
      url: "/dashboard/venues",
      icon: Building2,
    },

    // Reports - only for Global Director
    ...(userRole === "global_director"
      ? [
          {
            title: "Reports",
            url: "/dashboard/reports",
            icon: BarChart3,
          },
        ]
      : []),
    // Activity Logs - only for curators and above (non-event-planner)
    ...(isCurator
      ? [
          {
            title: "Logs",
            url: "/dashboard/logs",
            icon: Clock,
          },
        ]
      : []),
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
    {
      title: "Help Center",
      url: "/dashboard/help",
      icon: HelpCircle,
    },
  ];

  // Map navigation items with active state based on current pathname
  // If disabled (pending user), only enable Profile
  const navMain = baseNavMain.map((item) => {
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
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                    <Image
                      src="/images/shiraz-house-logo.webp"
                      alt="Shiraz House logo"
                      width={22}
                      height={22}
                      className="rounded"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Shiraz House</span>
                    <span className="truncate text-xs">Event Planner</span>
                  </div>
                </>
              ) : (
                <Link href="/dashboard">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lgimary text-sidebar-primary-foreground">
                    <Image
                      src="/images/shiraz-house-logo.webp"
                      alt="Shiraz House logo"
                      width={36}
                      height={36}
                      className="rounded"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Shiraz House</span>
                    <span className="truncate text-xs">Event Planner</span>
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
            role: userRole,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
