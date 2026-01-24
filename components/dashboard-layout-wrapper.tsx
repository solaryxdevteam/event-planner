"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PendingRedirect } from "@/components/pending-redirect";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  user: {
    first_name: string;
    last_name?: string | null;
    email: string;
    avatar?: string | null;
    role: string;
  };
  isPending: boolean;
}

// Map path segments to readable labels
const pathLabelMap: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  approvals: "Approvals",
  venues: "Venue Management",
  users: "User Management",
  profile: "Profile",
  pending: "Pending",
};

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  // Always start with Dashboard
  if (segments.length > 0 && segments[0] === "dashboard") {
    if (segments.length === 1) {
      // Just /dashboard - only show current page
      breadcrumbs.push({
        label: "Dashboard",
        href: "/dashboard",
        isCurrent: true,
      });
    } else {
      // Has sub-routes
      breadcrumbs.push({
        label: "Dashboard",
        href: "/dashboard",
        isCurrent: false,
      });

      // Build path progressively
      let currentPath = "/dashboard";
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += `/${segment}`;
        const label = pathLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isCurrent = i === segments.length - 1;

        breadcrumbs.push({
          label,
          href: currentPath,
          isCurrent,
        });
      }
    }
  }

  return breadcrumbs;
}

export function DashboardLayoutWrapper({ children, user, isPending }: DashboardLayoutWrapperProps) {
  const pathname = usePathname();
  const isProfilePage = pathname.startsWith("/dashboard/profile");
  const isVenuesPage = pathname.startsWith("/dashboard/venues");
  const breadcrumbs = generateBreadcrumbs(pathname);
  const [sidebarOpen, setSidebarOpen] = React.useState(!isVenuesPage);

  // Collapse sidebar when on venues page, open when leaving
  React.useEffect(() => {
    if (isVenuesPage) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isVenuesPage]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <PendingRedirect isPending={isPending} />
      <AppSidebar user={user} disabled={isPending && !isProfilePage} userRole={user.role} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" disabled={isPending && !isProfilePage} />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          {breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                      {crumb.isCurrent ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div
          className={`flex flex-1 flex-col gap-4 ${isVenuesPage ? "" : "p-4"} ${isPending && !isProfilePage ? "pointer-events-none opacity-50" : ""}`}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
