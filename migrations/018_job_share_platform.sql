-- Job Share Platform Database Schema
-- Supports posting job shares with qualification matching and automatic PAF generation
-- Runner: server/services/database-migrations.ts (Supabase exec_sql)
-- Verification:
--   SELECT COUNT(*) FROM job_share_posts;
--   SELECT COUNT(*) FROM job_share_applicants;
--   SELECT COUNT(*) FROM personnel_action_forms;
--   SELECT COUNT(*) FROM time_clock_permissions;
-- Code path (current state):
--   server/routes/job-sharing.ts uses in-memory mocks (DB wiring pending).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job Share Posts Table
CREATE TABLE IF NOT EXISTS job_share_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  outlet_id VARCHAR(255) NOT NULL,
  outlet_name VARCHAR(255) NOT NULL,
  position_title VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  reason TEXT NOT NULL,
  posted_by VARCHAR(255) NOT NULL,
  posted_by_name VARCHAR(255) NOT NULL,
  qualifications JSONB NOT NULL, -- { positionTitle, minTier, requiredSkills, requiredCertifications }
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed', 'cancelled')),
  paf_id VARCHAR(255), -- Generated when accepted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Share Applicants Table
CREATE TABLE IF NOT EXISTS job_share_applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES job_share_posts(id) ON DELETE CASCADE,
  employee_id VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  current_position VARCHAR(255) NOT NULL,
  current_tier INTEGER DEFAULT 1,
  qualified BOOLEAN NOT NULL DEFAULT FALSE,
  qualification_reasons TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personnel Action Forms Table (for PAF generation)
CREATE TABLE IF NOT EXISTS personnel_action_forms (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  employee_id VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  classification VARCHAR(50) NOT NULL, -- 'JOB_SHARE', 'PERMANENT', 'TEMPORARY', etc.
  job_share_post_id UUID REFERENCES job_share_posts(id),
  original_position VARCHAR(255),
  temporary_position VARCHAR(255),
  outlet_id VARCHAR(255),
  outlet_name VARCHAR(255),
  shift_date DATE,
  shift_start_time TIME,
  shift_end_time TIME,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  auto_generated BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Clock Permissions Table (for temporary access)
CREATE TABLE IF NOT EXISTS time_clock_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  employee_id VARCHAR(255) NOT NULL,
  position_title VARCHAR(255) NOT NULL,
  outlet_id VARCHAR(255) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  classification VARCHAR(50) NOT NULL DEFAULT 'JOB_SHARE',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_share_posts_org_id ON job_share_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_job_share_posts_status ON job_share_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_share_posts_outlet ON job_share_posts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_job_share_posts_shift_date ON job_share_posts(shift_date);
CREATE INDEX IF NOT EXISTS idx_job_share_applicants_post_id ON job_share_applicants(post_id);
CREATE INDEX IF NOT EXISTS idx_job_share_applicants_employee_id ON job_share_applicants(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_share_applicants_status ON job_share_applicants(status);
CREATE INDEX IF NOT EXISTS idx_paf_org_id ON personnel_action_forms(org_id);
CREATE INDEX IF NOT EXISTS idx_paf_employee_id ON personnel_action_forms(employee_id);
CREATE INDEX IF NOT EXISTS idx_paf_job_share_post_id ON personnel_action_forms(job_share_post_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_permissions_employee ON time_clock_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_permissions_dates ON time_clock_permissions(valid_from, valid_until);

-- Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_job_share_posts_updated_at BEFORE UPDATE ON job_share_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_action_forms_updated_at BEFORE UPDATE ON personnel_action_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_clock_permissions_updated_at BEFORE UPDATE ON time_clock_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
