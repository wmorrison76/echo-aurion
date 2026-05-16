CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT,
  producer TEXT,
  region TEXT,
  sub_region TEXT,
  country TEXT,
  vintage INT,
  varietals TEXT[],
  style TEXT,
  abv NUMERIC(4,2),
  body TEXT,
  tannin TEXT,
  acidity TEXT,
  sweetness TEXT,
  oak BOOLEAN,
  aromas TEXT[],
  winemaker_notes TEXT,
  ai_pairing_notes TEXT,
  critic_scores JSONB,
  image_url TEXT,
  image_license JSONB,
  allergens TEXT[],
  vegan BOOLEAN,
  closure TEXT,
  retail_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  supplier_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE inventory_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wine_id UUID REFERENCES wines(id),
  venue_id UUID,
  bin_location TEXT,
  qty_bottles INT,
  cost_per_bottle NUMERIC(10,2),
  received_date DATE,
  lot_code TEXT,
  par_level INT
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  invoice_number TEXT,
  order_date DATE,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'pending',
  total_cost NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  wine_id UUID REFERENCES wines(id),
  quantity INT,
  cost_per_bottle NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE pairing_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wine_id UUID REFERENCES wines(id),
  recipe_id UUID,
  pairing_score FLOAT,
  rationale TEXT,
  accepted_by_chef BOOLEAN DEFAULT FALSE,
  computed_at TIMESTAMP DEFAULT now()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  cuisine TEXT,
  intensity INT,
  acidity INT,
  sweetness INT,
  fatness INT,
  umami INT,
  spice INT,
  sauce TEXT
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'sommelier',
  venue_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE training_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  exam_type TEXT,
  score NUMERIC(5,2),
  answers JSONB,
  taken_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_wines_region ON wines(region);
CREATE INDEX idx_wines_vintage ON wines(vintage);
CREATE INDEX idx_inventory_wine_id ON inventory_lots(wine_id);
CREATE INDEX idx_inventory_venue_id ON inventory_lots(venue_id);
CREATE INDEX idx_pairing_wine_id ON pairing_evidence(wine_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_wine_id ON purchase_items(wine_id);
CREATE INDEX idx_training_exams_user_id ON training_exams(user_id);
CREATE INDEX idx_training_exams_exam_type ON training_exams(exam_type);
CREATE INDEX idx_training_exams_taken_at ON training_exams(taken_at);
