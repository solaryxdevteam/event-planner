"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  reports: "Reports",
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
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <SidebarProvider>
      <PendingRedirect isPending={isPending} />
      <AppSidebar user={user} disabled={isPending && !isProfilePage} userRole={user.role} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-1 sm:px-4">
          <SidebarTrigger className="-ml-1" disabled={isPending && !isProfilePage} />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden sm:block" />
          <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Image
              src="/images/shiraz-house-logo.webp"
              alt="Shiraz House logo"
              width={36}
              height={36}
              className="rounded sm:w-7 sm:h-7 sm:hidden"
            />
            <span className="font-semibold text-sm sm:hidden">Shiraz House</span>
          </Link>
          {/* Breadcrumbs in header for desktop */}
          {breadcrumbs.length > 0 && (
            <Breadcrumb className="hidden sm:block">
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
        {/* Breadcrumbs below header for mobile */}
        {breadcrumbs.length > 0 && (
          <div className="border-b px-2 sm:hidden py-1.5">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.isCurrent ? (
                        <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href} className="text-xs">
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
        <div
          className={`flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-1 sm:px-4 sm:!py-0 ${isPending && !isProfilePage ? "pointer-events-none opacity-50" : ""}`}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
