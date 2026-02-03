/**
 * API Client
 *
 * Centralized fetch wrapper for all API calls
 * Handles authentication, error handling, and response parsing
 */

/**
 * API Response type
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Request options
 */
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
  requireAuth?: boolean;
}

/**
 * Build query string from params
 */
function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * API Client class
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    // Use relative URLs for same-origin requests
    this.baseUrl = "";
  }

  /**
   * Get headers for requests
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getHeaders(_unusedRequireAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Note: Authentication is handled via cookies automatically by Next.js
    // If you need to add custom auth headers, do it here

    return headers;
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");

    // Check if response is JSON
    if (contentType?.includes("application/json")) {
      const data: ApiResponse<T> = await response.json();

      // Handle API error responses
      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error || `Request failed with status ${response.status}`,
          response.status,
          data.details
        );
      }

      // Return data if available
      if (data.data !== undefined) {
        return data.data;
      }

      // If no data but success, return undefined (for void responses)
      return undefined as T;
    }

    // Handle non-JSON responses
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || `Request failed with status ${response.status}`, response.status);
    }

    // Return empty for successful non-JSON responses
    return undefined as T;
  }

  /**
   * Make a request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, requireAuth = true, headers: customHeaders, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const queryString = buildQueryString(params);
      url += `?${queryString}`;
    }

    // Get headers
    const headers = {
      ...this.getHeaders(requireAuth),
      ...customHeaders,
    };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include", // Include cookies for authentication
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new ApiError("Network error: Unable to connect to server", 0, error);
      }

      // Handle other errors
      throw new ApiError(error instanceof Error ? error.message : "Unknown error occurred", 0, error);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
