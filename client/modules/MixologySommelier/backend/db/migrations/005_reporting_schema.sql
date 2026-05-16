-- Table for storing generated reports
CREATE TABLE IF NOT EXISTS stored_reports (
  id VARCHAR(255) PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP,
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  INDEX idx_venue_created (venue_id, created_at),
  INDEX idx_report_type (report_type),
  INDEX idx_expires (expires_at)
);

-- Table for report scheduling
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_day VARCHAR(20),
  schedule_time TIME,
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  INDEX idx_venue_active (venue_id, is_active),
  INDEX idx_next_run (next_run_at)
);

-- Table for report delivery logs
CREATE TABLE IF NOT EXISTS report_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id VARCHAR(255) REFERENCES stored_reports(id) ON DELETE CASCADE,
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  delivery_method VARCHAR(50),
  delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report (report_id),
  INDEX idx_status (delivery_status)
);

-- Table for report permissions
CREATE TABLE IF NOT EXISTS report_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id VARCHAR(255) REFERENCES stored_reports(id) ON DELETE CASCADE,
  user_id UUID,
  permission_type VARCHAR(50) CHECK (permission_type IN ('view', 'download', 'share', 'delete')),
  granted_by UUID,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (report_id, user_id, permission_type)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_stored_reports_venue ON stored_reports(venue_id DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_delivery_pending ON report_delivery_logs(delivery_status) WHERE delivery_status = 'pending';
