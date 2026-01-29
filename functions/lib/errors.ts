/**
 * Standardized error handling utilities for API responses
 */

/**
 * Standard error codes used across all API endpoints
 */
export enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',

  // Server errors (5xx)
  CONFIG_ERROR = 'CONFIG_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  code: ErrorCode
  timestamp: string
  details?: unknown
}

/**
 * Creates a standardized error Response object
 *
 * @param code - Error code enum value
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param corsHeaders - CORS headers to include
 * @param details - Optional additional error details (not exposed in production)
 * @returns Response object with standardized error format
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 500,
  corsHeaders: Record<string, string>,
  details?: unknown
): Response {
  const body: ErrorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
  }

  // Only include details in non-production environments
  if (details && process.env.NODE_ENV !== 'production') {
    body.details = details
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

/**
 * Pre-configured error response creators for common scenarios
 */
export const errors = {
  /**
   * 400 Bad Request - Validation errors
   */
  validation: (message: string, corsHeaders: Record<string, string>, details?: unknown) =>
    errorResponse(ErrorCode.VALIDATION_ERROR, message, 400, corsHeaders, details),

  /**
   * 400 Bad Request - Invalid request format
   */
  invalidRequest: (message: string, corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.INVALID_REQUEST, message, 400, corsHeaders),

  /**
   * 401 Unauthorized
   */
  unauthorized: (corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required', 401, corsHeaders),

  /**
   * 403 Forbidden
   */
  forbidden: (corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.FORBIDDEN, 'Access denied', 403, corsHeaders),

  /**
   * 404 Not Found
   */
  notFound: (resource: string, corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.NOT_FOUND, `${resource} not found`, 404, corsHeaders),

  /**
   * 429 Rate Limit Exceeded
   */
  rateLimit: (corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.RATE_LIMIT, 'Too many requests. Please try again later.', 429, corsHeaders),

  /**
   * 500 Internal Server Error
   */
  internal: (corsHeaders: Record<string, string>, details?: unknown) =>
    errorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500, corsHeaders, details),

  /**
   * 502 External API Error
   */
  externalApi: (service: string, corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.EXTERNAL_API_ERROR, `External service (${service}) temporarily unavailable`, 502, corsHeaders),

  /**
   * 503 Service Configuration Error
   */
  configError: (corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.CONFIG_ERROR, 'Service configuration error', 503, corsHeaders),

  /**
   * 503 Service Unavailable
   */
  serviceUnavailable: (corsHeaders: Record<string, string>) =>
    errorResponse(ErrorCode.SERVICE_UNAVAILABLE, 'Service temporarily unavailable', 503, corsHeaders),
}
