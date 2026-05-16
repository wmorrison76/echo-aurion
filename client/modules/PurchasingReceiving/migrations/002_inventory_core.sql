-- Inventory, outlet, and recipe cost persistence schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendors_name_key'
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_name_key UNIQUE (name);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT,
  timezone TEXT,
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS outlet_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','receiver','chef','finance','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outlet_memberships_outlet_user_key
  ON outlet_memberships (outlet_id, user_id);
CREATE INDEX IF NOT EXISTS outlet_memberships_user_idx
  ON outlet_memberships (user_id);

CREATE TABLE IF NOT EXISTS vendor_outlet_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT,
  keywords TEXT[],
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, code)
);

CREATE INDEX IF NOT EXISTS vendor_outlet_codes_outlet_idx
  ON vendor_outlet_codes (outlet_id);

CREATE TABLE IF NOT EXISTS standard_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  tier1 TEXT,
  tier2 TEXT,
  tier3 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS standard_product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  invoice_number TEXT,
  captured_on DATE,
  purchase_quantity NUMERIC(14,4),
  purchase_unit TEXT,
  total_cost NUMERIC(14,4),
  total_standard_units NUMERIC(14,4),
  cost_per_standard_unit NUMERIC(14,6),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (standard_product_id, vendor_id, outlet_id, captured_on, invoice_number)
);

CREATE INDEX IF NOT EXISTS standard_product_costs_outlet_idx
  ON standard_product_costs (outlet_id);
CREATE INDEX IF NOT EXISTS standard_product_costs_product_idx
  ON standard_product_costs (standard_product_id);

CREATE TABLE IF NOT EXISTS voice_inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transcript TEXT NOT NULL,
  parsed_item_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured','processed','error')),
  device_label TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES voice_inventory_logs(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC(14,4),
  unit TEXT,
  bin TEXT,
  confidence NUMERIC(5,2),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS voice_inventory_items_log_idx
  ON voice_inventory_items (log_id);

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_outlet_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY outlets_select_members ON outlets
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.outlet_id = outlets.id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY outlets_manage_service ON outlets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY outlet_memberships_select_self ON outlet_memberships
  FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY outlet_memberships_manage_service ON outlet_memberships
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY vendor_codes_select_members ON vendor_outlet_codes
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR outlet_id IS NULL
    OR EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.outlet_id = vendor_outlet_codes.outlet_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY vendor_codes_manage_service ON vendor_outlet_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY standard_products_select_all ON standard_products
  FOR SELECT
  USING (true);

CREATE POLICY standard_products_manage_service ON standard_products
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY standard_costs_select_members ON standard_product_costs
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR outlet_id IS NULL
    OR EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.outlet_id = standard_product_costs.outlet_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY standard_costs_manage_service ON standard_product_costs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY voice_logs_select_members ON voice_inventory_logs
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR outlet_id IS NULL
    OR EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.outlet_id = voice_inventory_logs.outlet_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY voice_logs_insert_members ON voice_inventory_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR outlet_id IS NULL
    OR EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.outlet_id = voice_inventory_logs.outlet_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY voice_logs_manage_service ON voice_inventory_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY voice_items_select_members ON voice_inventory_items
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM voice_inventory_logs vil
      JOIN outlet_memberships om ON om.outlet_id = vil.outlet_id
      WHERE vil.id = voice_inventory_items.log_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY voice_items_manage_service ON voice_inventory_items
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP VIEW IF EXISTS standard_product_latest_costs;

CREATE VIEW standard_product_latest_costs AS
SELECT DISTINCT ON (
  spc.standard_product_id,
  COALESCE(spc.outlet_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(spc.vendor_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
  spc.id,
  spc.standard_product_id,
  sp.name AS standard_product_name,
  sp.base_unit,
  sp.tier1,
  sp.tier2,
  sp.tier3,
  spc.vendor_id,
  v.name AS vendor_name,
  spc.invoice_id,
  spc.invoice_number,
  spc.outlet_id,
  o.name AS outlet_name,
  spc.captured_on,
  spc.purchase_quantity,
  spc.purchase_unit,
  spc.total_cost,
  spc.total_standard_units,
  spc.cost_per_standard_unit,
  spc.raw_payload,
  spc.created_at
FROM standard_product_costs spc
JOIN standard_products sp ON sp.id = spc.standard_product_id
LEFT JOIN vendors v ON v.id = spc.vendor_id
LEFT JOIN outlets o ON o.id = spc.outlet_id
ORDER BY
  spc.standard_product_id,
  COALESCE(spc.outlet_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(spc.vendor_id, '00000000-0000-0000-0000-000000000000'::uuid),
  spc.captured_on DESC NULLS LAST,
  spc.created_at DESC;

WITH upserted_outlets AS (
  INSERT INTO outlets (name, short_code, timezone, contact_email)
  VALUES
    ('Main Kitchen', 'MAIN', 'America/New_York', 'inventory@lucca.local'),
    ('Bakery', 'BAKE', 'America/New_York', 'bakery@lucca.local')
  ON CONFLICT (name) DO UPDATE
    SET short_code = EXCLUDED.short_code,
        timezone = EXCLUDED.timezone,
        contact_email = EXCLUDED.contact_email,
        updated_at = now()
  RETURNING id, name
),
upserted_vendors AS (
  INSERT INTO vendors (name, created_at, updated_at)
  VALUES
    ('Sysco', now(), now()),
    ('US Foods', now(), now()),
    ('Mr Greens', now(), now()),
    ('FreshPoint', now(), now()),
    ('Gold Medal Bakery', now(), now()),
    ('Halperns', now(), now()),
    ('WineDirect', now(), now()),
    ('Baldor', now(), now())
  ON CONFLICT (name) DO UPDATE SET updated_at = EXCLUDED.updated_at
  RETURNING id, name
),
outlet_vendor_codes AS (
  SELECT
    (SELECT id FROM upserted_vendors WHERE name = 'Sysco') AS vendor_id,
    (SELECT id FROM upserted_outlets WHERE name = 'Main Kitchen') AS outlet_id,
    'MK-SYSCO'::TEXT AS code,
    'Sysco Main Kitchen'::TEXT AS label,
    ARRAY['sysco', 'main kitchen']::TEXT[] AS keywords,
    10 AS priority
  UNION ALL SELECT
    (SELECT id FROM upserted_vendors WHERE name = 'US Foods'),
    (SELECT id FROM upserted_outlets WHERE name = 'Main Kitchen'),
    'MK-USF',
    'US Foods Main Kitchen',
    ARRAY['us foods', 'main kitchen'],
    8
  UNION ALL SELECT
    (SELECT id FROM upserted_vendors WHERE name = 'Mr Greens'),
    (SELECT id FROM upserted_outlets WHERE name = 'Main Kitchen'),
    'MK-GREENS',
    'Mr Greens Main Kitchen',
    ARRAY['greens', 'produce'],
    6
  UNION ALL SELECT
    (SELECT id FROM upserted_vendors WHERE name = 'FreshPoint'),
    (SELECT id FROM upserted_outlets WHERE name = 'Bakery'),
    'BK-FRESH',
    'FreshPoint Bakery',
    ARRAY['freshpoint', 'bakery'],
    4
  UNION ALL SELECT
    (SELECT id FROM upserted_vendors WHERE name = 'Gold Medal Bakery'),
    (SELECT id FROM upserted_outlets WHERE name = 'Bakery'),
    'BK-GOLD',
    'Gold Medal Vendor',
    ARRAY['gold medal', 'bread'],
    9
)
INSERT INTO vendor_outlet_codes (vendor_id, outlet_id, code, label, keywords, priority)
SELECT vendor_id, outlet_id, code, label, keywords, priority
FROM outlet_vendor_codes
WHERE vendor_id IS NOT NULL AND outlet_id IS NOT NULL
ON CONFLICT (vendor_id, code) DO UPDATE
  SET outlet_id = EXCLUDED.outlet_id,
      label = EXCLUDED.label,
      keywords = EXCLUDED.keywords,
      priority = EXCLUDED.priority;

WITH upserted_products AS (
  INSERT INTO standard_products (name, base_unit, tier1, tier2, tier3)
  VALUES
    ('Chicken Breast Boneless Skinless 10lb Case', 'oz', 'Protein', 'Poultry', 'Chicken'),
    ('Fryer Oil 35 lb Jug', 'oz', 'Dry Goods', 'Oils', NULL),
    ('Romaine Hearts Fresh 12ct', 'each', 'Produce', 'Vegetables', 'Leafy Greens'),
    ('Strawberries Fresh Flat 8 lb', 'oz', 'Produce', 'Fruits', 'Berries'),
    ('Kaiser Roll Bread 12ct', 'each', 'Bakery', NULL, NULL),
    ('Tomato Paste #10 Can', 'oz', 'Dry Goods', 'Canned', NULL),
    ('Cabernet Sauvignon 750ml Reserve', 'ml', 'Beverage', 'Wine', NULL),
    ('Orange Juice NFC 6/64 oz', 'oz', 'Beverage', 'Juices', NULL)
  ON CONFLICT (name) DO UPDATE
    SET base_unit = EXCLUDED.base_unit,
        tier1 = EXCLUDED.tier1,
        tier2 = EXCLUDED.tier2,
        tier3 = EXCLUDED.tier3,
        updated_at = now()
  RETURNING id, name
),
product_seed AS (
  SELECT
    'Chicken Breast Boneless Skinless 10lb Case'::TEXT AS product_name,
    'Sysco'::TEXT AS vendor_name,
    'Main Kitchen'::TEXT AS outlet_name,
    'MK-INV-1001'::TEXT AS invoice_number,
    current_date - 14 AS captured_on,
    10::NUMERIC(14,4) AS purchase_quantity,
    'lb'::TEXT AS purchase_unit,
    39.90::NUMERIC(14,4) AS total_cost,
    160::NUMERIC(14,4) AS total_standard_units,
    0.249375::NUMERIC(14,6) AS cost_per_standard_unit,
    jsonb_build_object('pack', '10 lb', 'source', 'seed') AS payload
  UNION ALL SELECT
    'Fryer Oil 35 lb Jug', 'US Foods', 'Main Kitchen', 'MK-INV-1012', current_date - 10,
    35::NUMERIC(14,4), 'lb', 28.50::NUMERIC(14,4), 560::NUMERIC(14,4), 0.050893::NUMERIC(14,6),
    jsonb_build_object('pack', '35 lb', 'source', 'seed')
  UNION ALL SELECT
    'Romaine Hearts Fresh 12ct', 'Mr Greens', 'Main Kitchen', 'MK-INV-1044', current_date - 7,
    12::NUMERIC(14,4), 'each', 22.40::NUMERIC(14,4), 12::NUMERIC(14,4), 1.866667::NUMERIC(14,6),
    jsonb_build_object('pack', '12 ct', 'source', 'seed')
  UNION ALL SELECT
    'Strawberries Fresh Flat 8 lb', 'FreshPoint', 'Bakery', 'BK-INV-2055', current_date - 6,
    8::NUMERIC(14,4), 'lb', 31.20::NUMERIC(14,4), 128::NUMERIC(14,4), 0.243750::NUMERIC(14,6),
    jsonb_build_object('pack', '8 lb', 'source', 'seed')
  UNION ALL SELECT
    'Kaiser Roll Bread 12ct', 'Gold Medal Bakery', 'Bakery', 'BK-INV-2090', current_date - 5,
    12::NUMERIC(14,4), 'each', 14.75::NUMERIC(14,4), 12::NUMERIC(14,4), 1.229167::NUMERIC(14,6),
    jsonb_build_object('pack', '12 ct', 'source', 'seed')
  UNION ALL SELECT
    'Tomato Paste #10 Can', 'Halperns', 'Main Kitchen', 'MK-INV-1072', current_date - 9,
    6::NUMERIC(14,4), 'can', 26.10::NUMERIC(14,4), 654::NUMERIC(14,4), 0.039908::NUMERIC(14,6),
    jsonb_build_object('pack', '6 #10', 'source', 'seed')
  UNION ALL SELECT
    'Cabernet Sauvignon 750ml Reserve', 'WineDirect', 'Main Kitchen', 'MK-INV-3021', current_date - 12,
    12::NUMERIC(14,4), 'bottle', 132.00::NUMERIC(14,4), 9000::NUMERIC(14,4), 0.014667::NUMERIC(14,6),
    jsonb_build_object('pack', '12 x 750 ml', 'source', 'seed')
  UNION ALL SELECT
    'Orange Juice NFC 6/64 oz', 'Baldor', 'Bakery', 'BK-INV-2110', current_date - 3,
    6::NUMERIC(14,4), 'bottle', 18.60::NUMERIC(14,4), 384::NUMERIC(14,4), 0.048438::NUMERIC(14,6),
    jsonb_build_object('pack', '6/64 oz', 'source', 'seed')
),
resolved_rows AS (
  SELECT
    sp.id AS standard_product_id,
    v.id AS vendor_id,
    o.id AS outlet_id,
    ps.invoice_number,
    ps.captured_on,
    ps.purchase_quantity,
    ps.purchase_unit,
    ps.total_cost,
    ps.total_standard_units,
    ps.cost_per_standard_unit,
    ps.payload
  FROM product_seed ps
  JOIN upserted_products sp ON sp.name = ps.product_name
  JOIN upserted_vendors v ON v.name = ps.vendor_name
  JOIN upserted_outlets o ON o.name = ps.outlet_name
)
INSERT INTO standard_product_costs (
  standard_product_id,
  vendor_id,
  outlet_id,
  invoice_number,
  captured_on,
  purchase_quantity,
  purchase_unit,
  total_cost,
  total_standard_units,
  cost_per_standard_unit,
  raw_payload
)
SELECT
  standard_product_id,
  vendor_id,
  outlet_id,
  invoice_number,
  captured_on,
  purchase_quantity,
  purchase_unit,
  total_cost,
  total_standard_units,
  cost_per_standard_unit,
  payload
FROM resolved_rows
ON CONFLICT (standard_product_id, vendor_id, outlet_id, captured_on, invoice_number) DO UPDATE
  SET purchase_quantity = EXCLUDED.purchase_quantity,
      purchase_unit = EXCLUDED.purchase_unit,
      total_cost = EXCLUDED.total_cost,
      total_standard_units = EXCLUDED.total_standard_units,
      cost_per_standard_unit = EXCLUDED.cost_per_standard_unit,
      raw_payload = EXCLUDED.raw_payload;
