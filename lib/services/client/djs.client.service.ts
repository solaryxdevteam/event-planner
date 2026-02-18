/**
 * DJ Client Service
 * Client-side API calls for DJs
 */

import { apiClient } from "./api-client";
import type { DJ } from "@/lib/types/database.types";
import type { CreateDjInput, UpdateDjInput } from "@/lib/validation/djs.schema";
import type { PaginatedDJs } from "@/lib/data-access/djs.dal";

export interface DJFilters {
  search?: string;
  activeOnly?: boolean;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchDjs(filters: DJFilters): Promise<PaginatedDJs> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters.search) params.search = filters.search;
  if (filters.activeOnly !== undefined) params.activeOnly = filters.activeOnly;
  if (filters.includeDeleted !== undefined) params.includeDeleted = filters.includeDeleted;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;

  return apiClient.get<PaginatedDJs>("/api/djs", { params });
}

export async function fetchActiveDjs(search?: string): Promise<DJ[]> {
  const result = await fetchDjs({
    search,
    activeOnly: true,
    pageSize: 200,
  });
  return result.data;
}

export async function fetchDjById(id: string): Promise<DJ> {
  return apiClient.get<DJ>(`/api/djs/${id}`);
}

export async function createDj(input: CreateDjInput): Promise<DJ> {
  return apiClient.post<DJ>("/api/djs", input);
}

export async function updateDj(id: string, input: UpdateDjInput): Promise<DJ> {
  return apiClient.put<DJ>(`/api/djs/${id}`, input);
}

export async function deleteDj(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/djs/${id}`);
}

export async function activateDj(id: string): Promise<void> {
  return apiClient.post<void>(`/api/djs/${id}/activate`);
}

export async function deactivateDj(id: string): Promise<void> {
  return apiClient.post<void>(`/api/djs/${id}/deactivate`);
}
