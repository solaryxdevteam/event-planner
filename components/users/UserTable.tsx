/**
 * User Table Component
 *
 * Displays list of users with ability to filter, sort, and perform actions
 */

"use client";

import { useState } from "react";
import type { Database } from "@/lib/types/database.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserActions } from "./UserActions";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ROLE_LABELS, ROLE_OPTIONS, UserRole } from "@/lib/types/roles";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UserTableProps {
  users: User[];
  onEditUser?: (user: User) => void;
  isLoading?: boolean;
  currentPage?: number;
  pageSize?: number;
  totalUsers?: number;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  roleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

// Role display names
const roleLabels: Record<User["role"], string> = {
  event_planner: "Event Planner",
  city_curator: "City Curator",
  regional_curator: "Regional Curator",
  lead_curator: "Lead Curator",
  global_director: "Global Director",
};

// Role badge colors - custom background colors for each role
const roleBadgeColors: Record<User["role"], string> = {
  event_planner:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  city_curator:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  regional_curator:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  lead_curator:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  global_director: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

// Status display names
const statusLabels: Record<"pending" | "active" | "inactive", string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};

// Status badge colors
const statusBadgeVariants: Record<
  "pending" | "active" | "inactive",
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  active: "default",
  inactive: "destructive",
};

export function UserTable({
  users,
  onEditUser,
  isLoading = false,
  currentPage = 1,
  pageSize = 10,
  totalUsers = 0,
  onPageChange,
  searchQuery: externalSearchQuery,
  onSearchChange,
  roleFilter: externalRoleFilter = "all",
  onRoleFilterChange,
  statusFilter: externalStatusFilter = "all",
  onStatusFilterChange,
}: UserTableProps) {
  // Use internal state if callbacks are not provided (backward compatibility)
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalRoleFilter, setInternalRoleFilter] = useState<string>("all");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const roleFilter = externalRoleFilter !== undefined ? externalRoleFilter : internalRoleFilter;
  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;

  // Calculate adjusted total (excluding Global Directors from count)
  const globalDirectorCount = users.filter((user) => user.role === UserRole.GLOBAL_DIRECTOR).length;
  const adjustedTotalUsers = totalUsers - globalDirectorCount;
  
  // Calculate pagination based on filtered users
  const totalPages = Math.ceil(adjustedTotalUsers / pageSize);
  const startIndex = adjustedTotalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, adjustedTotalUsers);

  // Handle search change
  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  // Handle role filter change
  const handleRoleFilterChange = (role: string) => {
    if (onRoleFilterChange) {
      onRoleFilterChange(role);
    } else {
      setInternalRoleFilter(role);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(status);
    } else {
      setInternalStatusFilter(status);
    }
  };

  // Handle page changes
  const handlePreviousPage = () => {
    if (onPageChange && currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (onPageChange && currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Filter out Global Directors and prepare users for display
  const filteredUsers = users.filter((user) => user.role !== UserRole.GLOBAL_DIRECTOR);
  const displayUsers = filteredUsers.map((user) => {
    const fullName = user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
    return { ...user, fullName };
  });

  // Skeleton rows for loading state
  const skeletonRows = Array.from({ length: pageSize }, (_, i) => (
    <TableRow key={`skeleton-${i}`}>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="space-y-4">
      {/* Filters Row - Search, Role Filter, Status Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <Select value={roleFilter} onValueChange={handleRoleFilterChange} disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.filter((option) => option.value !== UserRole.GLOBAL_DIRECTOR).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={handleStatusFilterChange} disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              skeletonRows
            ) : displayUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                    ? "No users found matching your filters."
                    : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              displayUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{user.company || "-"}</TableCell>
                  <TableCell>
                    <Badge className={roleBadgeColors[user.role]} variant="outline">
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariants[user.status]}>{statusLabels[user.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions user={user} onEdit={onEditUser} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Summary and Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {adjustedTotalUsers > 0 ? (
            <>
              Showing {startIndex} to {endIndex} of {adjustedTotalUsers} users
            </>
          ) : (
            "No users found"
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">Previous</span>
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis
                  const prevPage = page - 1;
                  const nextPage = page + 1;
                  if (
                    (prevPage === 1 || prevPage === currentPage - 2) &&
                    (nextPage === totalPages || nextPage === currentPage + 2)
                  ) {
                    return (
                      <span key={page} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageClick(page)}
                    className="min-w-[2.5rem]"
                    disabled={isLoading}
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isLoading}
              aria-label="Next page"
            >
              <span className="hidden sm:inline sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
