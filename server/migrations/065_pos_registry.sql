-- Migration: POS Registry
-- Purpose: Track POS catalog, mappings, printers, and routing rules
-- Date: 2026-01-23

CREATE TABLE IF NOT EXISTS pos_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  pos_type TEXT NOT NULL,
  pos_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(12, 2),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, pos_type, pos_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_catalog_org
  ON pos_catalog_items(org_id);

CREATE TABLE IF NOT EXISTS pos_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  pos_type TEXT NOT NULL,
  pos_item_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_item_mappings_entity
  ON pos_item_mappings(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS pos_printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  printer_id UUID NOT NULL REFERENCES pos_printers(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_routing_printer
  ON pos_routing_rules(printer_id);
