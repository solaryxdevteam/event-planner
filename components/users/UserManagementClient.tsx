/**
 * User Management Client Component
 *
 * Client wrapper for user management page to handle dialogs and state
 */

"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/types/database.types";
import { UserTable } from "./UserTable";
import { UserFormDialog } from "./UserFormDialog";
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import { HierarchyTreeFlow } from "@/components/users/hierarchy";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Mail } from "lucide-react";
import { useUsers, type UserFilters } from "@/lib/hooks/use-users";
import * as usersClientService from "@/lib/services/client/users.client.service";
import { useQueryClient } from "@tanstack/react-query";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UserManagementClientProps {
  initialUsers?: User[]; // Optional initial users for backward compatibility
  /** When false, only pyramid users are shown (from API) and all action buttons are hidden */
  isGlobalDirector?: boolean;
}

export function UserManagementClient({ initialUsers, isGlobalDirector = true }: UserManagementClientProps) {
  // initialUsers is kept for backward compatibility but not currently used
  void initialUsers;
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("list");

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "active" | "inactive" | null>(null);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Build filters for React Query (use debounced search)
  const filters: UserFilters = {
    page: currentPage,
    limit: pageSize,
    searchQuery: debouncedSearchQuery || undefined,
    roleFilter: roleFilter,
    statusFilter: statusFilter,
  };

  // Use React Query hook to fetch users
  const { data: usersData, isLoading } = useUsers(filters);

  // Extract users and pagination from response
  const users = usersData?.data || [];
  const totalUsers = usersData?.pagination?.total || 0;

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter changes
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleRoleFilterChange = (role: string) => {
    const roleValue = role === "all" ? null : role;
    setRoleFilter(roleValue);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleStatusFilterChange = (status: string) => {
    const statusValue = status === "all" ? null : (status as "pending" | "active" | "inactive");
    setStatusFilter(statusValue);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  // Handler for editing user from hierarchy (by userId)
  const handleEditUserFromHierarchy = async (userId: string) => {
    // First try to find user in current users list
    let userToEdit = users.find((u) => u.id === userId);

    // If not found, try to fetch from all users (without filters)
    if (!userToEdit) {
      try {
        const allUsersData = await usersClientService.fetchUsers({ limit: 1000 });
        userToEdit = allUsersData.data.find((u) => u.id === userId);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }

    if (userToEdit) {
      setEditingUser(userToEdit);
      setIsEditDialogOpen(true);
      // Don't switch tabs - keep user on hierarchy tab
    } else {
      console.error("User not found:", userId);
      // Could show a toast/notification here
    }
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingUser(undefined);
      // Invalidate hierarchy query to refresh after user update
      queryClient.invalidateQueries({ queryKey: ["users", "hierarchy"] });
    }
  };

  // Refresh is handled automatically by React Query invalidation in mutations
  const handleUserCreated = () => {
    // No-op - React Query will automatically refetch when mutations invalidate queries
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
            {isGlobalDirector ? "Manage users and their roles in the system" : "View users in your hierarchy"}
          </p>
        </div>
        {isGlobalDirector && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsInvitationDialogOpen(true)} className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Create Invitation
            </Button>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Users List</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <UserTable
            users={users}
            onEditUser={isGlobalDirector ? handleEditUser : undefined}
            canManage={isGlobalDirector}
            isLoading={isLoading}
            currentPage={currentPage}
            pageSize={pageSize}
            totalUsers={totalUsers}
            onPageChange={handlePageChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            roleFilter={roleFilter || "all"}
            onRoleFilterChange={handleRoleFilterChange}
            statusFilter={statusFilter || "all"}
            onStatusFilterChange={handleStatusFilterChange}
          />
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <HierarchyTreeFlow
            isActive={activeTab === "hierarchy"}
            onEditUser={isGlobalDirector ? handleEditUserFromHierarchy : undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            handleUserCreated();
          }
        }}
        mode="create"
      />

      {/* Edit User Dialog */}
      <UserFormDialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose} mode="edit" user={editingUser} />

      {/* Create Invitation Dialog */}
      <CreateInvitationDialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen} />
    </div>
  );
}
