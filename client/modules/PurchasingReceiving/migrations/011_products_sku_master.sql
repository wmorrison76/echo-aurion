-- Migration 011: Product Master Catalog & 3-Tier Categories
-- Creates the master SKU catalog with hierarchical categorization
-- Used by Approved Supplier Lists, purchasing, forecasting

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PRODUCT CATEGORIES (3-Tier hierarchical structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_tier1_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO product_tier1_categories (code, name, description, icon_emoji) VALUES
  ('meat_poultry', 'Meat & Poultry', 'Beef, pork, chicken, specialty proteins', '🥩'),
  ('seafood', 'Seafood', 'Fish, shellfish, prepared seafood', '🦐'),
  ('produce', 'Produce', 'Fresh vegetables, fruits, herbs', '🥬'),
  ('dairy', 'Dairy & Cheese', 'Milk, yogurt, cheese, butter', '🧀'),
  ('bakery', 'Bakery & Grains', 'Bread, baked goods, flour, rice', '🥖'),
  ('beverage', 'Beverages', 'Non-alcoholic drinks, juices, coffee', '☕'),
  ('spirits', 'Spirits & Wine', 'Liquor, wine, beer', '🍷'),
  ('supplies', 'Operating Supplies', 'Paper goods, chemicals, utensils', '🧹'),
  ('gaming', 'Gaming Supplies', 'Chips, cards, gaming equipment', '🎰'),
  ('housekeeping', 'Housekeeping', 'Linens, toiletries, cleaning', '🧺'),
  ('maintenance', 'Maintenance', 'HVAC, plumbing, electrical supplies', '🔧'),
  ('other', 'Other', 'Miscellaneous', '📦')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_tier2_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier1_id UUID NOT NULL REFERENCES product_tier1_categories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code)
);

INSERT INTO product_tier2_categories (tier1_id, code, name, description) VALUES
  ((SELECT id FROM product_tier1_categories WHERE code='meat_poultry'), 'beef', 'Beef & Veal', 'Steaks, ground beef, veal cuts'),
  ((SELECT id FROM product_tier1_categories WHERE code='meat_poultry'), 'pork', 'Pork', 'Pork cuts, ham, bacon'),
  ((SELECT id FROM product_tier1_categories WHERE code='meat_poultry'), 'chicken', 'Poultry', 'Chicken, turkey, prepared poultry'),
  ((SELECT id FROM product_tier1_categories WHERE code='seafood'), 'fish', 'Fish', 'Fresh and frozen fish'),
  ((SELECT id FROM product_tier1_categories WHERE code='seafood'), 'shellfish', 'Shellfish', 'Shrimp, crab, lobster, oysters'),
  ((SELECT id FROM product_tier1_categories WHERE code='produce'), 'vegetables', 'Vegetables', 'Fresh vegetables'),
  ((SELECT id FROM product_tier1_categories WHERE code='produce'), 'fruits', 'Fruits', 'Fresh fruits'),
  ((SELECT id FROM product_tier1_categories WHERE code='dairy'), 'milk', 'Milk & Cream', 'Fluid milk products'),
  ((SELECT id FROM product_tier1_categories WHERE code='dairy'), 'cheese', 'Cheese', 'All cheese varieties'),
  ((SELECT id FROM product_tier1_categories WHERE code='beverage'), 'coffee', 'Coffee & Tea', 'Coffee, tea, hot beverages'),
  ((SELECT id FROM product_tier1_categories WHERE code='beverage'), 'juice', 'Juices & Sodas', 'Fruit juice, soft drinks'),
  ((SELECT id FROM product_tier1_categories WHERE code='spirits'), 'liquor', 'Liquor & Spirits', 'Distilled spirits'),
  ((SELECT id FROM product_tier1_categories WHERE code='spirits'), 'wine', 'Wine', 'Red, white, specialty wines'),
  ((SELECT id FROM product_tier1_categories WHERE code='gaming'), 'chips', 'Gaming Chips', 'Clay and ceramic chips'),
  ((SELECT id FROM product_tier1_categories WHERE code='gaming'), 'cards', 'Playing Cards', 'Card decks, gaming cards'),
  ((SELECT id FROM product_tier1_categories WHERE code='housekeeping'), 'linens', 'Linens', 'Sheets, towels, linens'),
  ((SELECT id FROM product_tier1_categories WHERE code='housekeeping'), 'toiletries', 'Guest Amenities', 'Soap, shampoo, toiletries')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_tier3_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier2_id UUID NOT NULL REFERENCES product_tier2_categories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code)
);

INSERT INTO product_tier3_categories (tier2_id, code, name, description) VALUES
  ((SELECT id FROM product_tier2_categories WHERE code='beef'), 'ribeye', 'Ribeye Steak', '14-16 oz ribeye cuts'),
  ((SELECT id FROM product_tier2_categories WHERE code='beef'), 'nystrip', 'NY Strip Steak', 'New York strip cuts'),
  ((SELECT id FROM product_tier2_categories WHERE code='seafood'), 'shrimp_16_20', 'Shrimp 16-20', 'Premium shrimp, 16-20 count'),
  ((SELECT id FROM product_tier2_categories WHERE code='seafood'), 'shrimp_21_25', 'Shrimp 21-25', 'Standard shrimp, 21-25 count'),
  ((SELECT id FROM product_tier2_categories WHERE code='produce'), 'lettuce_iceberg', 'Iceberg Lettuce', 'Fresh iceberg lettuce heads'),
  ((SELECT id FROM product_tier2_categories WHERE code='produce'), 'tomato_vine', 'Vine Tomatoes', 'Ripe vine-ripened tomatoes'),
  ((SELECT id FROM product_tier2_categories WHERE code='dairy'), 'milk_whole_gal', 'Whole Milk 1 Gallon', 'Whole milk, 1 gallon containers'),
  ((SELECT id FROM product_tier2_categories WHERE code='spirits'), 'vodka', 'Vodka', 'All vodka brands'),
  ((SELECT id FROM product_tier2_categories WHERE code='spirits'), 'whiskey', 'Whiskey & Bourbon', 'Whiskey, bourbon, rye'),
  ((SELECT id FROM product_tier2_categories WHERE code='wine'), 'cabernet', 'Cabernet Sauvignon', 'Red wine, Cabernet variety'),
  ((SELECT id FROM product_tier2_categories WHERE code='gaming'), 'clay_chip_100', 'Clay Chip Denominations', 'Standard denominations')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PRODUCT MASTER (Universal SKU catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- NULL = global product
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier1_id UUID REFERENCES product_tier1_categories(id),
  tier2_id UUID REFERENCES product_tier2_categories(id),
  tier3_id UUID REFERENCES product_tier3_categories(id),
  base_unit TEXT NOT NULL,  -- 'case', 'lb', 'gal', 'each', 'count', etc
  standard_unit TEXT,       -- internal standard (e.g., 'case' for all suppliers)
  yield_percentage NUMERIC(5,2) DEFAULT 100,  -- % of purchased weight that's usable
  allergens TEXT[],
  is_specialty BOOLEAN DEFAULT FALSE,
  is_hazmat BOOLEAN DEFAULT FALSE,
  packaging_info TEXT,      -- '10 lbs per case, 4 cases per pallet'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE INDEX products_org_idx ON products (organization_id);
CREATE INDEX products_tier1_idx ON products (tier1_id);
CREATE INDEX products_tier2_idx ON products (tier2_id);
CREATE INDEX products_tier3_idx ON products (tier3_id);
CREATE INDEX products_active_idx ON products (active);

-- ============================================================================
-- PRODUCT ALIASES (For supplier variations)
-- Some suppliers call same product differently (e.g., "chicken breast" vs "chicken pcs")
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  alias_code TEXT NOT NULL,
  alias_name TEXT NOT NULL,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, supplier_id, alias_code)
);

-- ============================================================================
-- PRODUCT SUBSTITUTIONS (For forecasting & ordering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  substitute_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  substitution_ratio NUMERIC(5,2),  -- How many units of substitute = 1 unit of primary
  cost_delta_percent NUMERIC(5,2),  -- Price difference (for cost analysis)
  reason TEXT,  -- 'seasonal_unavailable', 'preferred_brand_out', 'cost_optimization'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX product_subs_primary_idx ON product_substitutions (primary_product_id);

-- ============================================================================
-- FAVORITE PRODUCTS (Per outlet, for quick ordering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS favorite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES vendors(id),
  default_qty NUMERIC(14,4),
  usage_count INT DEFAULT 0,
  last_ordered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(outlet_id, product_id, supplier_id)
);

CREATE INDEX favorite_products_outlet_idx ON favorite_products (outlet_id);
CREATE INDEX favorite_products_usage_idx ON favorite_products (usage_count DESC);
