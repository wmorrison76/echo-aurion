-- Tablet configurations table
CREATE TABLE tablet_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  credential_mode VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (credential_mode IN ('none', 'camera', 'employee_id', 'disabled')),
  include_chef_name BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tablet_configs_device_id ON tablet_configs(device_id);
CREATE INDEX idx_tablet_configs_enabled ON tablet_configs(enabled);

-- Tablet sessions table
CREATE TABLE tablet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token VARCHAR(500) UNIQUE NOT NULL,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  tablet_config_id UUID NOT NULL REFERENCES tablet_configs(id) ON DELETE CASCADE,
  user_id UUID,
  employee_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tablet_sessions_device_token ON tablet_sessions(device_token);
CREATE INDEX idx_tablet_sessions_session_token ON tablet_sessions(session_token);
CREATE INDEX idx_tablet_sessions_expires_at ON tablet_sessions(expires_at);
CREATE INDEX idx_tablet_sessions_tablet_config_id ON tablet_sessions(tablet_config_id);

-- Tablet print history (ISO 1000 compliant audit trail)
CREATE TABLE tablet_print_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(255),
  recipe_id VARCHAR(255) NOT NULL,
  recipe_name VARCHAR(255) NOT NULL,
  born_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  portion_size VARCHAR(100),
  portion_multiplier INTEGER DEFAULT 1,
  total_portions VARCHAR(100),
  allergens TEXT[] DEFAULT '{}',
  employee_id VARCHAR(100),
  chef_name VARCHAR(255),
  photo_url VARCHAR(500),
  qr_code_data TEXT,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tablet_print_history_device_id ON tablet_print_history(device_id);
CREATE INDEX idx_tablet_print_history_recipe_id ON tablet_print_history(recipe_id);
CREATE INDEX idx_tablet_print_history_printed_at ON tablet_print_history(printed_at);
CREATE INDEX idx_tablet_print_history_employee_id ON tablet_print_history(employee_id);
CREATE INDEX idx_tablet_print_history_archived_at ON tablet_print_history(archived_at);

-- View for compliance reporting
CREATE VIEW tablet_compliance_report AS
SELECT
  device_id,
  device_name,
  recipe_id,
  recipe_name,
  born_on,
  expires_on,
  total_portions,
  allergens,
  employee_id,
  chef_name,
  printed_at,
  DATE_TRUNC('day', printed_at) as print_date
FROM tablet_print_history
WHERE archived_at IS NULL
ORDER BY printed_at DESC;

-- Enable RLS (Row Level Security)
ALTER TABLE tablet_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablet_print_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all (can be tightened based on auth requirements)
CREATE POLICY "tablet_configs_select" ON tablet_configs FOR SELECT USING (true);
CREATE POLICY "tablet_configs_insert" ON tablet_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "tablet_configs_update" ON tablet_configs FOR UPDATE USING (true);

CREATE POLICY "tablet_sessions_select" ON tablet_sessions FOR SELECT USING (true);
CREATE POLICY "tablet_sessions_insert" ON tablet_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "tablet_sessions_update" ON tablet_sessions FOR UPDATE USING (true);
CREATE POLICY "tablet_sessions_delete" ON tablet_sessions FOR DELETE USING (true);

CREATE POLICY "tablet_print_history_select" ON tablet_print_history FOR SELECT USING (true);
CREATE POLICY "tablet_print_history_insert" ON tablet_print_history FOR INSERT WITH CHECK (true);
