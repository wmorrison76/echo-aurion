/**
 * Financial System Type Definitions
 * Shared types for event-driven financial pipeline
 */

/**
 * Base financial event type
 */
export interface TypedFinancialEvent {
  type: string;
  timestamp: number;
  outlet_id: string;
  org_id: string;
  data: Record<string, any>;
  metadata?: {
    source: string;
    user_id?: string;
    transaction_id?: string;
  };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
