-- Create cake_templates table for storing reusable cake designs
CREATE TABLE IF NOT EXISTS cake_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL DEFAULT 'custom',
  
  -- Full design snapshot
  design_data JSONB NOT NULL,
  
  -- AI seeds for reproducibility
  seeds JSONB DEFAULT '{}'::jsonb,
  
  -- Visual preview
  thumbnail_url VARCHAR,
  
  -- Sharing configuration
  sharing JSONB NOT NULL DEFAULT '{
    "shared": false,
    "shared_with": [],
    "can_duplicate": true,
    "can_modify": false
  }'::jsonb,
  
  -- Usage analytics
  metadata JSONB NOT NULL DEFAULT '{
    "usage_count": 0,
    "rating": 0,
    "last_used": null,
    "popular_variations": []
  }'::jsonb,
  
  -- Audit trail
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('wedding', 'birthday', 'corporate', 'custom', 'seasonal')),
  CONSTRAINT valid_design_data CHECK (design_data IS NOT NULL)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cake_templates_bakery ON cake_templates(bakery_id);
CREATE INDEX IF NOT EXISTS idx_cake_templates_category ON cake_templates(category);
CREATE INDEX IF NOT EXISTS idx_cake_templates_created_by ON cake_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_cake_templates_created_at ON cake_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cake_templates_bakery_category ON cake_templates(bakery_id, category);

-- Enable RLS
ALTER TABLE cake_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Templates visible only to users in the same bakery
CREATE POLICY "Templates visible to bakery members" ON cake_templates
  FOR SELECT
  USING (
    -- User must be from the same bakery
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- RLS: Users can create templates in their bakery
CREATE POLICY "Create templates in own bakery" ON cake_templates
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()::text
  );

-- RLS: Users can update their own templates or shared ones they have permissions for
CREATE POLICY "Update own templates" ON cake_templates
  FOR UPDATE
  USING (
    created_by = auth.uid()::text
  )
  WITH CHECK (
    created_by = auth.uid()::text
  );

-- RLS: Users can delete their own templates
CREATE POLICY "Delete own templates" ON cake_templates
  FOR DELETE
  USING (
    created_by = auth.uid()::text
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cake_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cake_templates_updated_at_trigger
BEFORE UPDATE ON cake_templates
FOR EACH ROW
EXECUTE FUNCTION update_cake_templates_updated_at();
