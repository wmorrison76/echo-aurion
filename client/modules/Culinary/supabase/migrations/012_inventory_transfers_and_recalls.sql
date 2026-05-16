-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('raw_ingredient', 'prep_recipe', 'finished_product')),
  unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, category)
);

-- Inventory Transfers Table
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  from_department TEXT NOT NULL,
  to_department TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  transferred_by TEXT,
  transfer_date TIMESTAMP DEFAULT NOW(),
  received_date TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- Food Recall Notifications Table
CREATE TABLE IF NOT EXISTS food_recall_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_id TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  action_required TEXT,
  issued_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Food Recall Device Notifications (tracks who has been notified)
CREATE TABLE IF NOT EXISTS food_recall_device_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_id UUID REFERENCES food_recall_notifications(id),
  device_id TEXT NOT NULL,
  device_name TEXT,
  first_notified_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_inventory_transfers_to_department ON inventory_transfers(to_department);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_inventory_transfers_transfer_date ON inventory_transfers(transfer_date DESC);
CREATE INDEX idx_food_recall_severity ON food_recall_notifications(severity);
CREATE INDEX idx_food_recall_device ON food_recall_device_notifications(device_id);
CREATE INDEX idx_food_recall_acknowledged ON food_recall_device_notifications(acknowledged_at);

-- Insert common inventory categories
INSERT INTO inventory_items (name, category, item_type, unit) VALUES
  ('Bananas', 'Produce', 'raw_ingredient', 'lb'),
  ('Chicken Stock', 'Prepared Items', 'prep_recipe', 'gallon'),
  ('Beef Stock', 'Prepared Items', 'prep_recipe', 'gallon'),
  ('Vegetable Stock', 'Prepared Items', 'prep_recipe', 'gallon'),
  ('Lasagna Prep', 'Prep Recipe', 'prep_recipe', 'pan'),
  ('Steak', 'Protein', 'raw_ingredient', 'lb'),
  ('Soup Base', 'Prepared Items', 'prep_recipe', 'gallon')
ON CONFLICT DO NOTHING;
