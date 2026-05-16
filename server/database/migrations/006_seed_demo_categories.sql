-- ============================================================================
-- Migration 006: Seed demo categories for test:api and dev
-- Inserts recipe_category, inventory_category, inventory_location for demo org
-- ============================================================================

-- Demo org and user IDs (from 001_create_base_schema.sql)
-- Org: 00000000-0000-0000-0000-000000000001
-- User: 00000000-0000-0000-0000-000000000001

-- Recipe category (Salads) for recipes tests
INSERT INTO recipe_categories (id, org_id, name, description, sort_order, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Salads',
  'Salad recipes',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Inventory category (Produce) for inventory tests
INSERT INTO inventory_categories (id, org_id, name, description, sort_order, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Produce',
  'Fresh produce',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Inventory location (Main Kitchen) for inventory tests
INSERT INTO inventory_locations (id, org_id, name, description, type, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Main Kitchen',
  'Primary kitchen storage',
  'kitchen',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
