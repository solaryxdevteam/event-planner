/**
 * User Management Client Component
 *
 * Client wrapper for user management page to handle dialogs and state
 */

"use client";

import { useState } from "react";
import type { Database } from "@/lib/types/database.types";
import { UserTable } from "./UserTable";
import { UserFormDialog } from "./UserFormDialog";
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import { HierarchyTree } from "./HierarchyTree";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Mail } from "lucide-react";
import { useUsers, type UserFilters } from "@/lib/hooks/use-users";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UserManagementClientProps {
  initialUsers?: User[]; // Optional initial users for backward compatibility
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  // initialUsers is kept for backward compatibility but not currently used
  void initialUsers;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "active" | "inactive" | null>(null);

  // Build filters for React Query
  const filters: UserFilters = {
    page: currentPage,
    limit: pageSize,
    searchQuery: searchQuery || undefined,
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

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingUser(undefined);
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
            Manage users and their roles in the system
          </p>
        </div>
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Users List</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <UserTable
            users={users}
            onEditUser={handleEditUser}
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
          <HierarchyTree />
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
