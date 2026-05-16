/**
 * PHASE 0: INVENTORY FRAMEWORK - LUCCCA Core
 * Database schema for multi-location inventory management
 * 
 * Tables:
 * - inventory_items: Current stock levels with weighted average cost
 * - inventory_transactions: Immutable audit log of all movements
 * 
 * Features:
 * - Full audit trail (immutable transactions)
 * - Weighted average cost tracking
 * - Multi-tenant isolation (org_id)
 * - Multi-location support (from_location → to_location)
 * - Integration with P&R, Events, EchoRecipePro, Aurum
 * 
 * Prerequisites:
 * - PostgreSQL 12+ (for partial indexes)
 * - UUID extension enabled
 * 
 * Run time: ~10 seconds
 */

-- ============================================================================
-- 1. INVENTORY ITEMS TABLE (Current Stock Levels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  product_id UUID NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  on_hand_qty NUMERIC(15, 6) NOT NULL DEFAULT 0,
  base_uom VARCHAR(50) NOT NULL DEFAULT 'EA',
  avg_cost NUMERIC(15, 6) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_receipt_at TIMESTAMP WITH TIME ZONE,
  last_count_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  UNIQUE(org_id, product_id, location_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_inventory_items_org_id ON inventory_items(org_id);
CREATE INDEX idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX idx_inventory_items_location_id ON inventory_items(location_id);
CREATE INDEX idx_inventory_items_org_product_location ON inventory_items(org_id, product_id, location_id);
CREATE INDEX idx_inventory_items_active ON inventory_items(org_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 2. INVENTORY TRANSACTIONS TABLE (Immutable Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- RECEIPT, TRANSFER_OUT, TRANSFER_IN, WASTE, PRODUCTION_OUT, PRODUCTION_IN
  product_id UUID NOT NULL,
  from_location_id VARCHAR(255),
  to_location_id VARCHAR(255),
  location_id VARCHAR(255) NOT NULL, -- Primary location (for non-transfer)
  qty NUMERIC(15, 6) NOT NULL, -- Signed: positive for IN, negative for OUT
  unit_cost NUMERIC(15, 6) NOT NULL,
  total_cost NUMERIC(15, 6) NOT NULL, -- qty * unit_cost
  waste_category VARCHAR(50), -- spoilage, damage, theft, quality, other
  waste_reason TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source_module VARCHAR(100) NOT NULL, -- PR, Events, EchoRecipePro, Aurum, etc.
  source_ref VARCHAR(255), -- invoice_id, event_id, po_id, etc.
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Enforce org isolation
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for common queries and reporting
CREATE INDEX idx_inventory_transactions_org_id ON inventory_transactions(org_id);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_location_id ON inventory_transactions(location_id);
CREATE INDEX idx_inventory_transactions_occurred_at ON inventory_transactions(org_id, occurred_at DESC);
CREATE INDEX idx_inventory_transactions_source_module ON inventory_transactions(org_id, source_module);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(org_id, type);
CREATE INDEX idx_inventory_transactions_org_product_date ON inventory_transactions(org_id, product_id, occurred_at DESC);

-- Partial index for waste analysis
CREATE INDEX idx_inventory_transactions_waste ON inventory_transactions(org_id, waste_category) 
  WHERE type = 'WASTE';

-- Partial index for transfers
CREATE INDEX idx_inventory_transactions_transfers ON inventory_transactions(org_id, from_location_id, to_location_id) 
  WHERE type IN ('TRANSFER_OUT', 'TRANSFER_IN');

-- ============================================================================
-- 3. PRODUCTS TABLE (Master Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  family VARCHAR(50), -- pantry, perishable, beverage, wine, spirits, supplies
  base_uom VARCHAR(50) NOT NULL DEFAULT 'EA',
  par_qty NUMERIC(15, 6),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[], -- JSON array or PostgreSQL array
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, name)
);

CREATE INDEX idx_products_org_id ON products(org_id);
CREATE INDEX idx_products_category ON products(org_id, category);
CREATE INDEX idx_products_family ON products(org_id, family);
CREATE INDEX idx_products_active ON products(org_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 4. LOCATIONS TABLE (Physical Locations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations_inventory (
  id VARCHAR(255) PRIMARY KEY, -- Can be UUID or string code (MAIN_KITCHEN, POOL_BAR, etc.)
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- CENTRAL_STOREROOM, COMMISSARY, PASTRY, MAESTRO, OUTLET, etc.
  parent_location_id VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  address VARCHAR(500),
  manager_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, maintenance
  is_production BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_locations_inventory_org_id ON locations_inventory(org_id);
CREATE INDEX idx_locations_inventory_type ON locations_inventory(org_id, type);
CREATE INDEX idx_locations_inventory_status ON locations_inventory(org_id, status);

-- ============================================================================
-- 5. VENDORS TABLE (Supplier Master Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  lead_time_days INT,
  min_order_qty NUMERIC(15, 6),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, name)
);

CREATE INDEX idx_vendors_org_id ON vendors(org_id);

-- ============================================================================
-- 6. PRODUCT_VENDORS TABLE (Product-Vendor Relationship)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  vendor_product_code VARCHAR(255),
  vendor_price NUMERIC(15, 6),
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  UNIQUE(product_id, vendor_id)
);

CREATE INDEX idx_product_vendors_product_id ON product_vendors(product_id);
CREATE INDEX idx_product_vendors_vendor_id ON product_vendors(vendor_id);

-- ============================================================================
-- GRANT PERMISSIONS (if using row-level security)
-- ============================================================================

-- Note: RLS policies should be configured per org_id
-- These are template statements; adjust based on your auth setup

-- For now, tables inherit org_id isolation from the application layer
-- Future: Enable RLS with policies enforcing org_id = auth.user_org_id()
