-- Migration 051: Barcode/GTIN Integration
-- Creates tables for GTIN lookup cache and barcode associations

-- GTIN lookup cache table (for external API results)
CREATE TABLE IF NOT EXISTS gtin_lookup_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin VARCHAR(50) NOT NULL UNIQUE,
  product_name TEXT,
  brand VARCHAR(255),
  category VARCHAR(255),
  manufacturer VARCHAR(255),
  description TEXT,
  image_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for GTIN lookups
CREATE INDEX IF NOT EXISTS idx_gtin_lookup_cache_gtin ON gtin_lookup_cache(gtin);
CREATE INDEX IF NOT EXISTS idx_gtin_lookup_cache_cached_at ON gtin_lookup_cache(cached_at);

-- Add barcode/GTIN columns to inventory_items if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inventory_items' AND column_name = 'barcode') THEN
    ALTER TABLE inventory_items ADD COLUMN barcode VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inventory_items' AND column_name = 'gtin') THEN
    ALTER TABLE inventory_items ADD COLUMN gtin VARCHAR(50);
  END IF;
END $$;

-- Add barcode/GTIN columns to recipe_ingredients if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'recipe_ingredients' AND column_name = 'barcode') THEN
    ALTER TABLE recipe_ingredients ADD COLUMN barcode VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'recipe_ingredients' AND column_name = 'gtin') THEN
    ALTER TABLE recipe_ingredients ADD COLUMN gtin VARCHAR(50);
  END IF;
END $$;

-- Create indexes for barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_gtin ON inventory_items(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_barcode ON recipe_ingredients(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_gtin ON recipe_ingredients(gtin) WHERE gtin IS NOT NULL;

-- Enable RLS on gtin_lookup_cache (read-only for all, write for service role)
ALTER TABLE gtin_lookup_cache ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow read access to authenticated users (cache is public data)
CREATE POLICY IF NOT EXISTS gtin_lookup_cache_read ON gtin_lookup_cache
  FOR SELECT
  USING (true);

-- RLS policy: Allow service role to insert/update (for caching external API results)
CREATE POLICY IF NOT EXISTS gtin_lookup_cache_service_write ON gtin_lookup_cache
  FOR ALL
  USING (current_setting('app.service_role', true) = 'true');

-- Comment on table
COMMENT ON TABLE gtin_lookup_cache IS 'Cached GTIN lookup results from external APIs (Open Product Data, GS1, etc.)';
COMMENT ON COLUMN gtin_lookup_cache.gtin IS 'Global Trade Item Number (UPC, EAN, ISBN, etc.)';
COMMENT ON COLUMN gtin_lookup_cache.cached_at IS 'Timestamp when this result was cached (used for cache expiration)';
