"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DJList } from "@/components/djs/DJList";
import { useDjs, useActivateDj, useDeactivateDj } from "@/lib/hooks/use-djs";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { PlusIcon, SearchIcon } from "lucide-react";

export default function DJsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState("");

  const { data: profile } = useProfile();
  const userRole = profile?.role || "event_planner";
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  const { data, isLoading } = useDjs({
    search: search || undefined,
    activeOnly: false,
    includeDeleted: false,
    page: currentPage,
    pageSize,
  });

  const activateMutation = useActivateDj();
  const deactivateMutation = useDeactivateDj();

  const djs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    const el = document.querySelector("[data-djs-content]");
    if (el) (el as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, search]);

  const handleDelete = () => {
    // List refetches via query invalidation from DeleteDjDialog
  };

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleDeactivate = (id: string) => {
    deactivateMutation.mutate(id);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto min-w-0" data-djs-content>
        <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">DJs</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                {total} {total === 1 ? "DJ" : "DJs"} found
              </p>
            </div>
            {isGlobalDirector && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/djs/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add DJ
                </Link>
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, music style, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card h-80 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : (
            <DJList
              djs={djs}
              userRole={userRole}
              onDelete={handleDelete}
              onActivate={isGlobalDirector ? handleActivate : undefined}
              onDeactivate={isGlobalDirector ? handleDeactivate : undefined}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
