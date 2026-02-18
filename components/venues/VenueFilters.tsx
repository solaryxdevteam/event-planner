/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { XIcon, SearchIcon } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any[] allows (value: string) => void
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/** Status filter: approval status, verified, and is_active in one dropdown */
export type VenueStatusFilter =
  | "all"
  | "active"
  | "banned"
  | "pending"
  | "approved"
  | "rejected"
  | "verified"
  | "not_verified";

export interface VenueFilters {
  search: string;
  status: VenueStatusFilter;
  totalCapacityMin: number | null;
  totalCapacityMax: number | null;
  numberOfTablesMin: number | null;
  numberOfTablesMax: number | null;
  ticketCapacityMin: number | null;
  ticketCapacityMax: number | null;
}

interface VenueFiltersProps {
  filters: VenueFilters;
  onFiltersChange: (filters: VenueFilters) => void;
  /** @deprecated Kept for API compatibility; total capacity filter commented out in UI */
  maxTotalCapacity?: number;
  /** @deprecated Kept for API compatibility; number of tables filter commented out in UI */
  maxNumberOfTables?: number;
  /** @deprecated Kept for API compatibility; ticket capacity filter commented out in UI */
  maxTicketCapacity?: number;
}

export function VenueFilters({ filters, onFiltersChange }: VenueFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  const debouncedSearch = useRef(
    debounce((value: string) => {
      onFiltersChange({ ...filters, search: value });
    }, 500)
  ).current;

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  // --- Commented out: past implementation (total capacity, number of tables, ticket capacity) ---
  // const [totalRange, setTotalRange] = useState<[number, number]>([
  //   filters.totalCapacityMin ?? 0,
  //   filters.totalCapacityMax ?? maxTotalCapacity,
  // ]);
  // const [tablesRange, setTablesRange] = useState<[number, number]>([
  //   filters.numberOfTablesMin ?? 0,
  //   filters.numberOfTablesMax ?? maxNumberOfTables,
  // ]);
  // const [ticketRange, setTicketRange] = useState<[number, number]>([
  //   filters.ticketCapacityMin ?? 0,
  //   filters.ticketCapacityMax ?? maxTicketCapacity,
  // ]);
  // React.useEffect(() => {
  //   setTotalRange([filters.totalCapacityMin ?? 0, filters.totalCapacityMax ?? maxTotalCapacity]);
  // }, [filters.totalCapacityMin, filters.totalCapacityMax, maxTotalCapacity]);
  // React.useEffect(() => {
  //   setTablesRange([filters.numberOfTablesMin ?? 0, filters.numberOfTablesMax ?? maxNumberOfTables]);
  // }, [filters.numberOfTablesMin, filters.numberOfTablesMax, maxNumberOfTables]);
  // React.useEffect(() => {
  //   setTicketRange([filters.ticketCapacityMin ?? 0, filters.ticketCapacityMax ?? maxTicketCapacity]);
  // }, [filters.ticketCapacityMin, filters.ticketCapacityMax, maxTicketCapacity]);
  // const handleTotalRangeChange = (values: number[]) => { ... };
  // const handleTablesRangeChange = (values: number[]) => { ... };
  // const handleTicketRangeChange = (values: number[]) => { ... };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange({
      search: "",
      status: "all",
      totalCapacityMin: null,
      totalCapacityMax: null,
      numberOfTablesMin: null,
      numberOfTablesMax: null,
      ticketCapacityMin: null,
      ticketCapacityMax: null,
    });
  };

  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="w-full flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by country, city or venue name..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => {
              setSearchValue("");
              onFiltersChange({ ...filters, search: "" });
            }}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as VenueStatusFilter })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="banned">Banned</SelectItem>
          <SelectItem value="pending">Pending Approval</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="verified">Contact email verified</SelectItem>
          <SelectItem value="not_verified">Contact email not verified</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <XIcon className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
