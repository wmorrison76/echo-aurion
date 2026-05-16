-- Enhanced Employee Management Schema
-- Supports 15,000+ employees with encryption, compliance, and HR integration
-- Created: 2024

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Employee Profiles Table (Core employee data)
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  employee_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  
  -- Personal Information
  date_of_birth DATE,
  ssn_encrypted TEXT, -- AES-256 encrypted via pgcrypto
  i9_verified BOOLEAN DEFAULT FALSE,
  i9_verified_date TIMESTAMP,
  
  -- Employment Details
  employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('SALARY', 'HOURLY', '1099_CONTRACTOR')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ONBOARDING', 'SUSPENDED', 'TERMINATED')),
  department VARCHAR(100) NOT NULL,
  outlet_id UUID,
  outlet_name VARCHAR(255),
  position_title VARCHAR(100),
  hire_date DATE,
  manager_id UUID REFERENCES employee_profiles(id),
  
  -- Compensation
  hourly_rate NUMERIC(10,2),
  salary NUMERIC(12,2),
  commission_structure VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (commission_structure IN ('NONE', 'FULL_COMMISSION', 'SALARY_PLUS_COMMISSION')),
  commission_rate NUMERIC(5,2),
  
  -- Work Authorization
  work_authorization_type VARCHAR(20) NOT NULL DEFAULT 'CITIZEN',
  work_auth_document TEXT, -- File reference
  work_auth_expires DATE,
  
  -- Tip & Service Position Info
  is_tip_position BOOLEAN DEFAULT FALSE,
  tip_pool_eligible BOOLEAN DEFAULT FALSE,
  
  -- Access Control
  access_level VARCHAR(20) NOT NULL DEFAULT 'FULL' CHECK (access_level IN ('FULL', 'LIMITED', 'READ_ONLY', 'NONE')),
  can_access_system BOOLEAN DEFAULT TRUE,
  access_restrictions JSONB,
  
  -- Schedule Integration
  schedule_id UUID,
  shift_pattern VARCHAR(20),
  primary_shift_start TIME,
  primary_shift_end TIME,
  
  -- Security & Compliance
  password_temporary BOOLEAN DEFAULT TRUE,
  password_expires_at TIMESTAMP,
  last_login_at TIMESTAMP,
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP,
  nda_accepted BOOLEAN DEFAULT FALSE,
  nda_accepted_at TIMESTAMP,
  non_compete_accepted BOOLEAN DEFAULT FALSE,
  non_compete_accepted_at TIMESTAMP,
  
  -- System Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Unique constraints
  UNIQUE(org_id, employee_number),
  UNIQUE(org_id, email),
  
  -- Indexes for performance (15,000+ records)
  INDEX idx_employee_org_status (org_id, status),
  INDEX idx_employee_org_dept (org_id, department),
  INDEX idx_employee_org_outlet (org_id, outlet_id),
  INDEX idx_employee_email (email),
  INDEX idx_employee_number (employee_number)
);

-- Employee Access Control Table
CREATE TABLE IF NOT EXISTS employee_access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id),
  access_level VARCHAR(20) NOT NULL,
  can_access_at_home BOOLEAN DEFAULT FALSE,
  shift_based_access BOOLEAN DEFAULT FALSE,
  shift_buffer_minutes INTEGER DEFAULT 15,
  allowed_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  restricted_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  effective_date DATE NOT NULL,
  expires_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_access_employee (employee_id),
  INDEX idx_access_effective (effective_date)
);

-- Credentials Management Table
CREATE TABLE IF NOT EXISTS employee_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id),
  temporary_password_hash VARCHAR(255) NOT NULL,
  password_expires_at TIMESTAMP NOT NULL,
  qr_code_url TEXT,
  setup_token VARCHAR(100),
  setup_token_expires_at TIMESTAMP,
  email_sent_at TIMESTAMP,
  email_status VARCHAR(20) DEFAULT 'PENDING' CHECK (email_status IN ('PENDING', 'SENT', 'FAILED', 'OPENED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cred_employee (employee_id),
  INDEX idx_cred_token (setup_token)
);

-- Terms Acceptance Table
CREATE TABLE IF NOT EXISTS terms_acceptance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id),
  terms_type VARCHAR(30) NOT NULL CHECK (terms_type IN ('NDA', 'NON_COMPETE', 'GENERAL_TERMS')),
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_by_user UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accepted_version VARCHAR(50),
  
  INDEX idx_terms_employee (employee_id),
  INDEX idx_terms_type (terms_type)
);

-- Hourly Access Log Table (For compliance/audit)
CREATE TABLE IF NOT EXISTS employee_hourly_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(30) NOT NULL,
  reason TEXT,
  shift_id UUID,
  shift_start TIMESTAMP,
  shift_end TIMESTAMP,
  is_within_buffer BOOLEAN,
  buffer_minutes INTEGER,
  
  INDEX idx_access_log_employee (employee_id),
  INDEX idx_access_log_timestamp (timestamp)
);

-- Bulk Upload Jobs Table
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  filename VARCHAR(255) NOT NULL,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED')),
  errors JSONB DEFAULT '[]'::JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  encryption_salt VARCHAR(255),
  
  INDEX idx_bulk_org (org_id),
  INDEX idx_bulk_status (status)
);

-- HR System Credentials Table (Encrypted)
CREATE TABLE IF NOT EXISTS hr_system_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  system_type VARCHAR(30) NOT NULL CHECK (system_type IN ('ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS', 'OTHER')),
  api_key_encrypted TEXT NOT NULL, -- Encrypted with pgcrypto
  api_secret_encrypted TEXT,
  api_endpoint VARCHAR(500) NOT NULL,
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  sync_frequency VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(org_id, system_type),
  INDEX idx_hr_org (org_id)
);

-- Sync Log Table (For debugging/compliance)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  system_type VARCHAR(30) NOT NULL,
  action VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_affected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  INDEX idx_sync_org (org_id),
  INDEX idx_sync_system (system_type)
);

-- Row Level Security Policies
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see employees from their org
CREATE POLICY employee_org_isolation ON employee_profiles
  FOR SELECT USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY employee_org_insert ON employee_profiles
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

-- Update trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Encryption function for SSN (pgcrypto)
-- Usage: INSERT INTO employee_profiles (..., ssn_encrypted)
-- VALUES (..., pgp_sym_encrypt('123-45-6789', 'encryption_key'))
-- Note: Key should be from environment, not hardcoded

CREATE OR REPLACE FUNCTION encrypt_ssn(ssn TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(ssn, encryption_key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_ssn(ssn_encrypted TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(ssn_encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql;
