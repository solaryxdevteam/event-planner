import type { ActionResponse } from "@/lib/types/api.types";
import { getErrorMessage, isAppError, logError } from "./errors";

/**
 * Helper function to create a success response
 */
export function successResponse<T>(data: T, message?: string): ActionResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Helper function to create an error response
 */
export function errorResponse(error: string | Error | unknown, details?: unknown): ActionResponse<never> {
  const errorMessage = typeof error === "string" ? error : getErrorMessage(error);

  return {
    success: false,
    error: errorMessage,
    ...(details && { details }),
  };
}

/**
 * Wrapper for handling async operations with consistent error handling
 * Usage:
 *   const result = await handleAsync(async () => {
 *     return await someAsyncOperation();
 *   });
 */
export async function handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<ActionResponse<T>> {
  try {
    const data = await operation();
    return successResponse(data);
  } catch (error) {
    // Log the error with context
    logError(error, context);

    // Return appropriate error response
    if (isAppError(error)) {
      return errorResponse(error.message, error.details);
    }

    return errorResponse(error);
  }
}

/**
 * Wrapper for handling sync operations with consistent error handling
 */
export function handleSync<T>(operation: () => T, context?: string): ActionResponse<T> {
  try {
    const data = operation();
    return successResponse(data);
  } catch (error) {
    logError(error, context);

    if (isAppError(error)) {
      return errorResponse(error.message, error.details);
    }

    return errorResponse(error);
  }
}

/**
 * Type guard to check if response is successful
 */
export function isSuccess<T>(response: ActionResponse<T>): response is { success: true; data: T; message?: string } {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isError(
  response: ActionResponse<unknown>
): response is { success: false; error: string; details?: unknown } {
  return response.success === false;
}

/**
 * Utility to unwrap a successful response or throw an error
 * Useful for server-side code where you want to propagate errors
 */
export function unwrapResponse<T>(response: ActionResponse<T>): T {
  if (isSuccess(response)) {
    return response.data;
  }

  throw new Error(response.error);
}
