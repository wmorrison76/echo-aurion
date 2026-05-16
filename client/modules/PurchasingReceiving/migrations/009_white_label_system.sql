-- Create white_label_configs table
CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  
  -- Colors JSON
  colors JSONB DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#8B5CF6",
    "accent": "#EC4899",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "error": "#EF4444",
    "warning": "#F59E0B",
    "success": "#10B981",
    "info": "#0EA5E9",
    "text": "#1F2937",
    "textSecondary": "#6B7280",
    "border": "#E5E7EB"
  }'::JSONB,
  
  -- Typography JSON
  typography JSONB DEFAULT '{
    "fontFamily": "Inter, system-ui, sans-serif",
    "headingFont": "Inter, system-ui, sans-serif",
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem"
    },
    "fontWeight": {
      "light": 300,
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  }'::JSONB,
  
  -- Spacing JSON
  spacing JSONB DEFAULT '{
    "xs": "0.25rem",
    "sm": "0.5rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem",
    "2xl": "3rem"
  }'::JSONB,
  
  -- Branding JSON
  branding JSONB DEFAULT '{
    "appName": "Lucca",
    "appDescription": "Restaurant Management Platform",
    "logoUrl": "/logo.svg",
    "logoUrlDark": "/logo-dark.svg",
    "faviconUrl": "/favicon.ico",
    "primaryEmail": "hello@lucca.io",
    "supportEmail": "support@lucca.io",
    "supportPhone": "+1-800-LUCCA-APP",
    "website": "https://lucca.io",
    "socialLinks": {
      "twitter": "https://twitter.com/lucca",
      "facebook": "https://facebook.com/lucca",
      "instagram": "https://instagram.com/lucca",
      "linkedin": "https://linkedin.com/company/lucca"
    }
  }'::JSONB,
  
  -- Feature flags JSON
  feature_flags JSONB DEFAULT '{
    "enableNotifications": true,
    "enablePayments": true,
    "enableReporting": true,
    "enableMultiOutlet": true,
    "enableMobileApp": true,
    "enableAnalytics": true,
    "enableAuditLogs": true,
    "enableAdvancedAnalytics": true,
    "enableMultiCurrency": true,
    "enableWebhooks": true
  }'::JSONB,
  
  -- Custom CSS and JavaScript
  custom_css TEXT,
  custom_javascript TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  
  CONSTRAINT valid_domain CHECK (domain ~ '^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?(\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?)*$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_white_label_configs_domain ON white_label_configs(domain);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_active ON white_label_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_created_at ON white_label_configs(created_at);

-- Create white_label_audit_log table for tracking changes
CREATE TABLE IF NOT EXISTS white_label_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  changed_by UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_white_label_audit_log_config_id ON white_label_audit_log(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_log_created_at ON white_label_audit_log(created_at);

-- Create white_label_feature_toggles table for dynamic feature control
CREATE TABLE IF NOT EXISTS white_label_feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  rollout_percentage INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(config_id, feature_name)
);

-- Create index for feature toggles
CREATE INDEX IF NOT EXISTS idx_white_label_feature_toggles_config_id ON white_label_feature_toggles(config_id);

-- Create white_label_domains table for domain mapping
CREATE TABLE IF NOT EXISTS white_label_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for domain mapping
CREATE INDEX IF NOT EXISTS idx_white_label_domains_domain ON white_label_domains(domain);
CREATE INDEX IF NOT EXISTS idx_white_label_domains_config_id ON white_label_domains(config_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_white_label_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_white_label_configs_updated_at
BEFORE UPDATE ON white_label_configs
FOR EACH ROW
EXECUTE FUNCTION update_white_label_updated_at();

CREATE TRIGGER trigger_white_label_domains_updated_at
BEFORE UPDATE ON white_label_domains
FOR EACH ROW
EXECUTE FUNCTION update_white_label_updated_at();

CREATE TRIGGER trigger_white_label_feature_toggles_updated_at
BEFORE UPDATE ON white_label_feature_toggles
FOR EACH ROW
EXECUTE FUNCTION update_white_label_updated_at();

-- Insert default configuration
INSERT INTO white_label_configs (id, name, domain, is_active, created_by)
VALUES (
  'default-config',
  'Default Configuration',
  'default',
  true,
  NULL
)
ON CONFLICT DO NOTHING;

-- Create security policy for white_label_configs
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to view active configurations
CREATE POLICY white_label_configs_view_active ON white_label_configs
  FOR SELECT
  USING (is_active = true);

-- Policy: Allow authenticated users to view their own configurations
CREATE POLICY white_label_configs_view_own ON white_label_configs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can insert/update/delete (enforce via application logic)
CREATE POLICY white_label_configs_admin_only ON white_label_configs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
