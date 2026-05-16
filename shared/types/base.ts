/**
 * Base Type System for EchoAurum
 *
 * These foundational types are used across all domain types to eliminate
 * duplication and ensure consistency. All domain entities should extend
 * from these base types rather than redefining common fields.
 *
 * Design: composition over inheritance (industry standard).
 * - Instead of inheritance (rigid): class Recipe extends BaseClass { }
 * - Use composition (flexible):    interface Recipe extends BaseEntity, Nameable, Taggable { }
 * Domain types mix only the traits they need; no deep class hierarchies.
 *
 * @module shared/types/base
 */

// ============================================================================
// PRIMITIVE TYPES
// ============================================================================

/**
 * Universally Unique Identifier (UUID v4)
 * @example "123e4567-e89b-12d3-a456-426614174000"
 */
export type UUID = string;

/**
 * ISO 8601 DateTime string
 * @example "2026-02-03T18:30:00.000Z"
 */
export type ISODate = string;

/**
 * ISO 8601 DateTime string — alias for ISODate, kept distinct semantically
 * for readers who want the distinction "this field carries hh:mm:ss precision."
 * Used by Voyage / Atrium / Aurion / Network type contracts.
 * @example "2026-02-03T18:30:00.000Z"
 */
export type ISODateTime = ISODate;

/**
 * Guest UUID. Aliased to UUID for clarity at field-name sites where
 * "id" alone is ambiguous between guest, staff, and property.
 */
export type GuestId = UUID;

/**
 * Property UUID. See GuestId for rationale.
 */
export type PropertyId = UUID;

/**
 * Staff member UUID. See GuestId for rationale. Note: some surfaces
 * (e.g., resonance reading.capturedBy) accept the literal string 'aurion'
 * in addition to a StaffId — those fields use `StaffId | 'aurion'`.
 */
export type StaffId = UUID;

/**
 * Email address string
 * @example "chef@restaurant.com"
 */
export type Email = string;

/**
 * Percentage value (0-100)
 * @example 15.5 (represents 15.5%)
 */
export type Percentage = number;

/**
 * Monetary amount in cents to avoid floating point issues
 * @example 1599 (represents $15.99)
 */
export type Money = number;

/**
 * Phone number string (E.164 format recommended)
 * @example "+14155552671"
 */
export type PhoneNumber = string;

/**
 * URL string
 * @example "https://restaurant.com"
 */
export type URL = string;

/**
 * Color hex code
 * @example "#FF5733"
 */
export type HexColor = string;

// ============================================================================
// BASE ENTITY INTERFACES
// ============================================================================

/**
 * Base entity with core fields present on all database records
 *
 * @property id - Unique identifier for this entity
 * @property orgId - Organization this entity belongs to (multi-tenancy)
 * @property createdAt - Timestamp when entity was created
 * @property updatedAt - Timestamp when entity was last updated
 * @property archivedAt - When entity was archived (optional; set once, applies to 100+ types)
 */
export interface BaseEntity {
  id: UUID;
  orgId: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt?: ISODate;
}

/**
 * Auditable tracking - who created/modified this entity
 *
 * @property createdBy - User ID who created this entity
 * @property updatedBy - User ID who last updated this entity
 */
export interface Auditable {
  createdBy: UUID;
  updatedBy: UUID;
}

/**
 * Nameable - entities with name and description
 *
 * @property name - Display name
 * @property description - Optional detailed description
 */
export interface Nameable {
  name: string;
  description?: string;
}

/**
 * Schedulable - entities with start and end dates
 *
 * @property startDate - When this entity becomes active
 * @property endDate - When this entity expires/completes
 */
export interface Schedulable {
  startDate: ISODate;
  endDate: ISODate;
}

/**
 * Assignable - entities that can be assigned to users
 *
 * @property assignedTo - User ID this is assigned to
 * @property assignedBy - User ID who made the assignment
 * @property assignedAt - When the assignment was made
 */
export interface Assignable {
  assignedTo?: UUID;
  assignedBy?: UUID;
  assignedAt?: ISODate;
}

/**
 * Prioritizable - entities with priority and status
 *
 * @property priority - Priority level (1=highest, 5=lowest)
 * @property status - Current workflow status
 */
export interface Prioritizable {
  priority: number; // 1-5, where 1 is highest priority
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
}

/**
 * Soft Deletable - entities that support soft deletion
 *
 * @property deletedAt - When entity was deleted (null if active)
 * @property deletedBy - User who deleted this entity
 */
export interface SoftDeletable {
  deletedAt?: ISODate;
  deletedBy?: UUID;
}

/**
 * Versionable - entities with version tracking
 *
 * @property version - Version number (increments on each update)
 * @property previousVersionId - Link to previous version for history
 */
export interface Versionable {
  version: number;
  previousVersionId?: UUID;
}

/**
 * Taggable - entities that support categorization via tags
 *
 * @property tags - Array of tag strings for filtering/searching
 */
export interface Taggable {
  tags?: string[];
}

/**
 * Geolocatable - entities with geographic location
 *
 * @property latitude - Geographic latitude
 * @property longitude - Geographic longitude
 * @property address - Human-readable address
 */
export interface Geolocatable {
  latitude?: number;
  longitude?: number;
  address?: string;
}

/**
 * Approvable - entities requiring approval workflow
 *
 * @property approvalStatus - Current approval state
 * @property approvedBy - User who approved
 * @property approvedAt - When approval was granted
 * @property rejectedBy - User who rejected
 * @property rejectedAt - When rejection occurred
 * @property rejectionReason - Why it was rejected
 */
export interface Approvable {
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'needs_review';
  approvedBy?: UUID;
  approvedAt?: ISODate;
  rejectedBy?: UUID;
  rejectedAt?: ISODate;
  rejectionReason?: string;
}

/**
 * Commentable - entities that support comments/notes
 *
 * @property notes - Internal notes (staff only)
 * @property comments - Public comments
 */
export interface Commentable {
  notes?: string;
  comments?: string;
}

/**
 * Archivable - entities that can be archived (not deleted)
 *
 * @property archivedAt - When entity was archived
 * @property archivedBy - User who archived this entity
 */
export interface Archivable {
  archivedAt?: ISODate;
  archivedBy?: UUID;
}

/**
 * Publishable - entities with draft/published states
 *
 * @property publishedAt - When entity was published (null if draft)
 * @property publishedBy - User who published
 * @property isDraft - Whether this is a draft version
 */
export interface Publishable {
  publishedAt?: ISODate;
  publishedBy?: UUID;
  isDraft: boolean;
}

// ============================================================================
// COMMON COMPOSITE TYPES
// ============================================================================

/**
 * Standard entity - most common combination
 * Has ID, org, timestamps, and audit tracking
 */
export interface StandardEntity extends BaseEntity, Auditable {}

/**
 * Named entity - standard entity with name/description
 */
export interface NamedEntity extends StandardEntity, Nameable {}

/**
 * Full-featured entity - everything except kitchen sink
 */
export interface FullEntity extends
  StandardEntity,
  Nameable,
  SoftDeletable,
  Taggable,
  Commentable {}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties optional (for partial updates)
 */
export type PartialEntity<T> = Partial<T>;

/**
 * Make specific properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit base entity fields (useful for create operations)
 */
export type EntityInput<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

/**
 * Omit base + audit fields (for user input)
 */
export type UserInput<T extends StandardEntity> = Omit<T, keyof StandardEntity>;

/**
 * Pick only the ID (for references)
 */
export type EntityReference = Pick<BaseEntity, 'id'>;

// ============================================================================
// PAGINATION & FILTERING
// ============================================================================

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standard filter operators
 */
export type FilterOperator =
  | 'eq'      // equals
  | 'ne'      // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'nin'     // not in array
  | 'like'    // SQL LIKE (contains)
  | 'ilike'   // case-insensitive LIKE
  | 'between' // between two values
  | 'null'    // is null
  | 'nnull';  // is not null

/**
 * Generic filter type
 */
export interface Filter<T = any> {
  field: string;
  operator: FilterOperator;
  value: T;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard API error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error for a single field
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Collection of validation errors
 */
export interface ValidationErrors {
  errors: ValidationError[];
}
