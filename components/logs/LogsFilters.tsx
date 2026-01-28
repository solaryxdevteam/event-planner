/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Button } from "@/components/ui/button";
import { XIcon, Filter } from "lucide-react";
import { format } from "date-fns";

export interface LogsFiltersState {
  actionType: string | "all";
  dateFrom: string | null;
  dateTo: string | null;
  userId: string | null;
}

export interface LogsFiltersProps {
  filters: LogsFiltersState;
  onFiltersChange: (filters: LogsFiltersState) => void;
  availableUsers: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
  }>;
  isLoadingUsers?: boolean;
}

// All supported action types from the database enum + nice labels
const ACTION_TYPE_OPTIONS: { value: string | "all"; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "create_draft", label: "Create Draft" },
  { value: "delete_draft", label: "Delete Draft" },
  { value: "submit_for_approval", label: "Submit for Approval" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "request_modification", label: "Request Modification" },
  { value: "approve_modification", label: "Approve Modification" },
  { value: "reject_modification", label: "Reject Modification" },
  { value: "request_cancellation", label: "Request Cancellation" },
  { value: "approve_cancellation", label: "Approve Cancellation" },
  { value: "reject_cancellation", label: "Reject Cancellation" },
  { value: "submit_report", label: "Submit Report" },
  { value: "approve_report", label: "Approve Report" },
  { value: "reject_report", label: "Reject Report" },
  { value: "update_event", label: "Update Event" },
  { value: "create_user", label: "Create User" },
  { value: "update_user", label: "Update User" },
  { value: "deactivate_user", label: "Deactivate User" },
  { value: "create_venue", label: "Create Venue" },
  { value: "update_venue", label: "Update Venue" },
  { value: "delete_venue", label: "Delete Venue" },
  { value: "ban_venue", label: "Ban Venue" },
];

export function LogsFilters({ filters, onFiltersChange, availableUsers, isLoadingUsers }: LogsFiltersProps) {
  const [localDateRange, setLocalDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  } | null>(() =>
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      : null
  );

  const initializedRef = useRef(false);

  // Keep local date range in sync when filters are changed externally
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (filters.dateFrom || filters.dateTo) {
      setLocalDateRange({
        from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        to: filters.dateTo ? new Date(filters.dateTo) : undefined,
      });
    } else {
      setLocalDateRange(null);
    }
  }, [filters.dateFrom, filters.dateTo]);

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    setLocalDateRange(range || null);

    onFiltersChange({
      ...filters,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleClearFilters = () => {
    setLocalDateRange(null);
    onFiltersChange({
      actionType: "all",
      dateFrom: null,
      dateTo: null,
      userId: null,
    });
  };

  const hasActiveFilters = filters.actionType !== "all" || filters.dateFrom || filters.dateTo || filters.userId;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-xs">
            <XIcon className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Action Type */}
        <div className="space-y-2">
          <Label>Action type</Label>
          <Select
            value={filters.actionType}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                actionType: value as LogsFiltersState["actionType"],
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <DateRangePicker
            value={localDateRange || undefined}
            onChange={handleDateRangeChange}
            placeholder="Any time"
            label="Date range"
          />
        </div>

        {/* User Combobox */}
        <div className="space-y-2">
          <UserCombobox
            label="User"
            value={filters.userId}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                userId: value,
              })
            }
            options={availableUsers}
            placeholder="All users"
            loading={isLoadingUsers}
          />
        </div>
      </div>
    </div>
  );
}
