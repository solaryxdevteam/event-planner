import { ErrorCode } from "@/lib/types/api.types";

/**
 * Custom Application Error Class
 * Extends the standard Error class with additional context
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown
    Object.setPrototypeOf(this, AppError.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Captures stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

/**
 * Predefined error factories for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier ? `${resource} with identifier "${identifier}" not found` : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.CONFLICT, 409, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.BAD_REQUEST, 400, details);
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper to extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}

/**
 * Helper to log errors appropriately based on environment
 */
export function logError(error: unknown, context?: string): void {
  const contextPrefix = context ? `[${context}] ` : "";

  if (isAppError(error)) {
    if (error.isOperational) {
      // Expected operational errors (log as warning)
      console.warn(`${contextPrefix}Operational Error:`, error.toJSON());
    } else {
      // Programming or system errors (log as error)
      console.error(`${contextPrefix}System Error:`, error.toJSON());
    }
  } else {
    // Unknown errors (log as error with full details)
    console.error(`${contextPrefix}Unknown Error:`, error);
  }
}
