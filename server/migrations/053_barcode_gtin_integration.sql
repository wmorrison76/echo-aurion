/**
 * Barcode/GTIN Integration Schema
 * Supports barcode scanning for inventory management and recipe ingredient matching
 */

-- =====================================================
-- BARCODE PRODUCT CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS barcode_product_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  barcode VARCHAR(255) NOT NULL,
  gtin VARCHAR(255),
  
  -- Product information
  product_name VARCHAR(255),
  brand VARCHAR(255),
  manufacturer VARCHAR(255),
  description TEXT,
  category VARCHAR(255),
  unit_of_measure VARCHAR(50),
  
  -- Extended metadata (JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_barcode_org UNIQUE (barcode, org_id)
);

CREATE INDEX idx_barcode_cache_barcode ON barcode_product_cache(barcode);
CREATE INDEX idx_barcode_cache_org ON barcode_product_cache(org_id);
CREATE INDEX idx_barcode_cache_gtin ON barcode_product_cache(gtin);
CREATE INDEX idx_barcode_cache_name ON barcode_product_cache(product_name);

-- =====================================================
-- BARCODE SCANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Barcode information
  barcode VARCHAR(255) NOT NULL,
  barcode_type VARCHAR(50) NOT NULL CHECK (barcode_type IN ('UPC', 'EAN', 'GTIN-13', 'GTIN-14', 'ITF-14', 'CODE128', 'CODE39')),
  
  -- Scan metadata
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  scanned_by UUID REFERENCES auth.users(id),
  device_id VARCHAR(255),
  
  -- Associated data
  inventory_item_id UUID,
  recipe_id UUID,
  quantity NUMERIC,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_barcode_scans_org ON barcode_scans(org_id);
CREATE INDEX idx_barcode_scans_barcode ON barcode_scans(barcode);
CREATE INDEX idx_barcode_scans_scanned_at ON barcode_scans(scanned_at DESC);
CREATE INDEX idx_barcode_scans_item ON barcode_scans(inventory_item_id);
CREATE INDEX idx_barcode_scans_recipe ON barcode_scans(recipe_id);

-- =====================================================
-- INVENTORY ITEMS BARCODE SUPPORT (ALTER EXISTING TABLE)
-- =====================================================

-- Add barcode and GTIN columns to inventory_items if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN barcode VARCHAR(255);
    CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'gtin'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN gtin VARCHAR(255);
    CREATE INDEX idx_inventory_items_gtin ON inventory_items(gtin);
  END IF;
END $$;

-- =====================================================
-- RECIPE INGREDIENTS BARCODE SUPPORT (ALTER EXISTING TABLE)
-- =====================================================

-- Add barcode column to recipe_ingredients if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' AND column_name = 'preferred_barcode'
  ) THEN
    ALTER TABLE recipe_ingredients ADD COLUMN preferred_barcode VARCHAR(255);
    CREATE INDEX idx_recipe_ingredients_barcode ON recipe_ingredients(preferred_barcode);
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE barcode_product_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY barcode_cache_tenant_isolation ON barcode_product_cache
  FOR ALL
  USING (
    org_id IS NULL OR 
    org_id = current_setting('app.current_org_id', TRUE)::uuid
  );

CREATE POLICY barcode_scans_tenant_isolation ON barcode_scans
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE barcode_product_cache IS 'Cached product information from barcode lookups (GS1, OpenFoodFacts, etc.)';
COMMENT ON TABLE barcode_scans IS 'Audit log of all barcode scans for inventory and recipe matching';
