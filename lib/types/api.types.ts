/**
 * Standard API Response Type
 * Used for consistent error handling and data responses across the application
 */

export type ActionResponse<T = void> = 
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      details?: unknown;
    };

/**
 * Helper type for extracting data type from ActionResponse
 */
export type ExtractData<T> = T extends ActionResponse<infer D> ? D : never;

/**
 * Pagination types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * API Error types
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
