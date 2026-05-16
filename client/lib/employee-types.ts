/**
 * Enhanced Employee Data Model
 * Supports 15,000+ employees across multiple locations
 * Includes salary/hourly, work authorization, commission structure
 */

export type EmploymentType = 'SALARY' | 'HOURLY' | '1099_CONTRACTOR';
export type WorkAuthorizationType = 'CITIZEN' | 'GREEN_CARD' | 'H1B' | 'H2B' | 'J1' | 'L1' | 'OTHER';
export type CommissionStructure = 'NONE' | 'FULL_COMMISSION' | 'SALARY_PLUS_COMMISSION';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'TERMINATED';
export type AccessLevel = 'FULL' | 'LIMITED' | 'READ_ONLY' | 'NONE';

export interface EmployeeProfile {
  // Core Identification
  id: string;
  org_id: string;
  employee_number: string; // Unique within org, used to link to HR systems
  email: string;
  first_name: string;
  last_name: string;
  phone: string;

  // Personal Information
  date_of_birth?: string; // ISO date
  ssn_encrypted?: string; // AES-256 encrypted
  i9_verified?: boolean;
  i9_verified_date?: string;

  // Employment Details
  employment_type: EmploymentType;
  status: EmployeeStatus;
  department: string;
  outlet_id: string;
  outlet_name: string;
  position_title: string;
  hire_date: string; // ISO date
  manager_id?: string; // Reference to another employee
  
  // Compensation
  hourly_rate?: number; // For hourly/1099 employees
  salary?: number; // For salary employees
  commission_structure: CommissionStructure;
  commission_rate?: number; // Percentage for commission positions

  // Work Authorization
  work_authorization_type: WorkAuthorizationType;
  work_auth_document?: string; // File reference for I-9, passport, etc
  work_auth_expires?: string; // ISO date

  // Tip & Service Position Info
  is_tip_position: boolean;
  tip_pool_eligible?: boolean;

  // Access Control
  access_level: AccessLevel;
  can_access_system: boolean;
  access_restrictions?: {
    hourly_only?: boolean; // For hourly employees
    on_site_only?: boolean;
    shift_based?: boolean; // Tied to schedule
    shift_buffer_minutes?: number; // 15 or 30 min buffer
  };

  // Schedule Integration
  schedule_id?: string; // Link to schedule module
  shift_pattern?: string; // 'FIXED', 'ROTATING', 'VARIABLE'
  primary_shift_start?: string; // HH:mm format
  primary_shift_end?: string; // HH:mm format

  // Security & Compliance
  password_temporary?: boolean;
  password_expires_at?: string;
  last_login_at?: string;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  nda_accepted?: boolean;
  nda_accepted_at?: string;
  non_compete_accepted?: boolean;
  non_compete_accepted_at?: string;

  // System Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  is_deleted: boolean;
  deleted_at?: string;
}

export interface BulkUploadTemplate {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  outlet_id: string;
  outlet_name: string;
  position_title: string;
  hire_date: string; // YYYY-MM-DD
  employment_type: 'SALARY' | 'HOURLY' | '1099';
  hourly_rate?: string;
  salary?: string;
  commission_structure: 'NONE' | 'FULL_COMMISSION' | 'SALARY_PLUS_COMMISSION';
  commission_rate?: string;
  is_tip_position: 'YES' | 'NO';
  work_authorization: 'CITIZEN' | 'GREEN_CARD' | 'H1B' | 'H2B' | 'J1' | 'L1' | 'OTHER';
  manager_employee_number?: string;
  shift_pattern: 'FIXED' | 'ROTATING' | 'VARIABLE';
  primary_shift_start?: string; // HH:mm
  primary_shift_end?: string; // HH:mm
}

export interface EmployeeAccessControl {
  employee_id: string;
  access_level: AccessLevel;
  can_access_at_home: boolean; // Only for SALARY
  shift_based_access: boolean; // Only for HOURLY
  shift_buffer_minutes: number;
  allowed_modules: string[]; // List of module IDs they can access
  restricted_modules: string[]; // List of module IDs they cannot access
  effective_date: string;
  expires_at?: string;
  created_at: string;
}

export interface EmployeeCredentials {
  employee_id: string;
  temporary_password: string;
  password_expires_at: string;
  qr_code_url?: string; // For mobile setup
  setup_token?: string; // Single-use token for first login
  setup_token_expires_at?: string;
  email_sent_at?: string;
  email_status: 'PENDING' | 'SENT' | 'FAILED' | 'OPENED';
  created_at: string;
}

export interface TermsAcceptance {
  id: string;
  employee_id: string;
  terms_type: 'NDA' | 'NON_COMPETE' | 'GENERAL_TERMS';
  accepted_at: string;
  accepted_by_user: string; // Employee's user ID
  ip_address?: string;
  user_agent?: string; // Browser info
  accepted_version?: string; // Version of terms they accepted
}

export interface EmployeeHourlyAccessLog {
  id: string;
  employee_id: string;
  timestamp: string;
  action: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_DENIED' | 'ACCESS_GRANTED' | 'ACCESS_DENIED';
  reason?: string; // 'OFF_CLOCK', 'NO_SCHEDULED_SHIFT', 'LOCATION_RESTRICTED', etc
  shift_id?: string;
  shift_start?: string;
  shift_end?: string;
  is_within_buffer?: boolean;
  buffer_minutes?: number;
  created_at: string;
}

export interface BulkUploadJob {
  id: string;
  org_id: string;
  filename: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  errors: Array<{
    row_number: number;
    employee_number: string;
    error_message: string;
  }>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  created_by: string;
  encryption_salt?: string; // For encrypted uploads
}

export interface HRSystemCredentials {
  id: string;
  org_id: string;
  system_type: 'ADP' | 'GUSTO' | 'ONTRACK' | 'UNFOCUS' | 'OTHER';
  api_key_encrypted: string; // AES-256 encrypted
  api_secret_encrypted?: string;
  api_endpoint: string;
  username?: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_frequency?: string; // HOURLY, DAILY, WEEKLY
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  org_id: string;
  system_type: string;
  action: 'PULL_EMPLOYEES' | 'PUSH_EMPLOYEES' | 'SYNC_SCHEDULES' | 'SYNC_PAYROLL';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  records_affected: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
}
