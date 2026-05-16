-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  business_name TEXT,
  business_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create consent_forms table
CREATE TABLE IF NOT EXISTS consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL DEFAULT 'adult_content', -- adult_content, general_terms, etc.
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_url TEXT, -- URL to stored PDF in Supabase Storage
  pdf_content_base64 TEXT, -- Base64 encoded PDF for printing
  signed_at TIMESTAMP,
  signed_by_user TEXT, -- Username/email of person who gave consent
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create cake_designs table
CREATE TABLE IF NOT EXISTS cake_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  design_name TEXT,
  design_config JSONB NOT NULL, -- Cake config, tiers, flavors, etc.
  image_url TEXT, -- URL to stored image
  is_adult_content BOOLEAN DEFAULT FALSE,
  theme TEXT, -- "classic", "adult", "birthday", etc.
  servings INTEGER,
  estimated_price NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- Will store EXIF data here as JSON
);

-- Create audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- "image_generation", "consent_signed", "image_accessed", etc.
  resource_type TEXT, -- "cake_design", "consent_form", "image"
  resource_id UUID, -- Reference to the resource (cake_design, consent_form, etc.)
  is_adult_content BOOLEAN DEFAULT FALSE,
  content_warning_acknowledged BOOLEAN DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  status TEXT, -- "success", "denied", "pending_consent"
  reason TEXT, -- Why action was taken or denied
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_compliance_settings table
CREATE TABLE IF NOT EXISTS admin_compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_client_id ON consent_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_form_type ON consent_forms(form_type);
CREATE INDEX IF NOT EXISTS idx_cake_designs_client_id ON cake_designs(client_id);
CREATE INDEX IF NOT EXISTS idx_cake_designs_is_adult ON cake_designs(is_adult_content);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_adult ON audit_logs(is_adult_content);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view their own client info" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own client info" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for consent_forms
CREATE POLICY "Users can view their own consent forms" ON consent_forms
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own consent forms" ON consent_forms
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- RLS Policies for cake_designs
CREATE POLICY "Users can view their own cake designs" ON cake_designs
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- RLS Policies for audit_logs (restricted - admins only via role check)
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert default compliance settings
INSERT INTO admin_compliance_settings (setting_key, setting_value, description)
VALUES
  ('adult_content_opacity', '0.8', 'Opacity level for adult content overlay (0-1)'),
  ('require_consent_for_adult', 'true', 'Require explicit consent before generating adult content'),
  ('log_all_requests', 'true', 'Log all image generation requests to audit trail'),
  ('adult_overlay_blur', '8px', 'Blur filter strength for adult content'),
  ('auto_flag_adult_content', 'true', 'Automatically flag images containing adult themes');
