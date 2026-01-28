"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditLogWithUser } from "@/lib/data-access/audit-logs.dal";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { LogsFilters, type LogsFiltersState } from "./LogsFilters";
import { LogsTable } from "./LogsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/services/client/api-client";

interface MinimalUser {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: string;
}

// Fetch lightweight list of active users for the combobox
// Note: The `/api/users` endpoint returns a paginated response: { data: User[], pagination: {...} }
async function fetchLogUsers(): Promise<MinimalUser[]> {
  const response = await apiClient.get<{
    data: MinimalUser[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/api/users", {
    params: {
      limit: 200,
      statusFilter: "active",
    },
  });

  // Extract the data array from the paginated response
  return response.data || [];
}

export function LogsClient() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [filters, setFilters] = useState<LogsFiltersState>({
    actionType: "all",
    dateFrom: null,
    dateTo: null,
    userId: null,
  });

  const apiFilters = useMemo(
    () => ({
      page,
      limit,
      actionType: filters.actionType !== "all" ? filters.actionType : null,
      userId: filters.userId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [page, limit, filters.actionType, filters.userId, filters.dateFrom, filters.dateTo]
  );

  const { data: logsResponse, isLoading: isLoadingLogs, error: logsError } = useAuditLogs(apiFilters);
  const logs: AuditLogWithUser[] = logsResponse?.logs ?? [];
  const hasMore = logsResponse?.pagination.hasMore ?? false;

  const {
    data: userOptions = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["logs", "users"],
    queryFn: fetchLogUsers,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleFiltersChange = (next: LogsFiltersState) => {
    setFilters(next);
    setPage(1);
  };

  const hasAnyError = Boolean(logsError || usersError);

  return (
    <div className="space-y-4">
      {hasAnyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load logs</AlertTitle>
          <AlertDescription>
            {(logsError as Error | undefined)?.message ||
              (usersError as Error | undefined)?.message ||
              "Please try again in a moment."}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {isLoadingUsers && !userOptions.length ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <LogsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableUsers={userOptions}
          isLoadingUsers={isLoadingUsers}
        />
      )}

      {/* Table */}
      <LogsTable
        logs={logs}
        isLoading={isLoadingLogs}
        page={page}
        limit={limit}
        hasMore={hasMore}
        onPageChange={setPage}
      />
    </div>
  );
}
