-- ============================================================================
-- Migration 002: Domain Tables
-- Creates all business domain tables (inventory, recipes, BEO, etc.)
-- ============================================================================

-- ============================================================================
-- INVENTORY DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Base fields
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(7),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_inventory_categories_org ON inventory_categories(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_inventory_categories_parent ON inventory_categories(parent_category_id);

CREATE TRIGGER update_inventory_categories_updated_at
    BEFORE UPDATE ON inventory_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Base fields
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Location details
    type VARCHAR(50) NOT NULL, -- kitchen, walk_in, dry_storage, bar, prep, other
    capacity NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_inventory_locations_org ON inventory_locations(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_inventory_locations_type ON inventory_locations(type) WHERE is_active = TRUE;

CREATE TRIGGER update_inventory_locations_updated_at
    BEFORE UPDATE ON inventory_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Base fields
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tags TEXT[],
    
    -- Item details
    sku VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0, -- in cents
    
    -- Relationships
    supplier_id UUID, -- References suppliers table (created later)
    category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    
    -- Inventory control
    min_stock NUMERIC(10,2) DEFAULT 0,
    max_stock NUMERIC(10,2) DEFAULT 0,
    reorder_point NUMERIC(10,2) DEFAULT 0,
    last_ordered TIMESTAMPTZ,
    last_received TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    
    CONSTRAINT unique_org_sku UNIQUE(org_id, sku)
);

CREATE INDEX idx_inventory_items_org ON inventory_items(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_location ON inventory_items(location_id);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(org_id) 
    WHERE quantity <= reorder_point AND archived_at IS NULL;

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Transaction details
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- receipt, consumption, transfer, adjustment, waste
    quantity NUMERIC(10,2) NOT NULL,
    
    -- Transfer details
    from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    
    -- Reference
    reference_id UUID,
    reference_type VARCHAR(100),
    reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_inventory_transactions_org ON inventory_transactions(org_id);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at);

CREATE TRIGGER update_inventory_transactions_updated_at
    BEFORE UPDATE ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Count details
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMPTZ NOT NULL,
    completed_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    counted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_inventory_counts_org ON inventory_counts(org_id);
CREATE INDEX idx_inventory_counts_location ON inventory_counts(location_id);
CREATE INDEX idx_inventory_counts_status ON inventory_counts(status);

CREATE TRIGGER update_inventory_counts_updated_at
    BEFORE UPDATE ON inventory_counts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RECIPE DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Base fields
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_category_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(7),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_categories_org ON recipe_categories(org_id) WHERE archived_at IS NULL;

CREATE TRIGGER update_recipe_categories_updated_at
    BEFORE UPDATE ON recipe_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Base fields
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tags TEXT[],
    
    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    
    -- Publishing
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_draft BOOLEAN DEFAULT TRUE,
    
    -- Category
    category_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
    
    -- Timing
    prep_time INTEGER DEFAULT 0, -- minutes
    cook_time INTEGER DEFAULT 0, -- minutes
    total_time INTEGER DEFAULT 0, -- minutes
    rest_time INTEGER,
    
    -- Yield
    servings INTEGER NOT NULL DEFAULT 1,
    serving_size VARCHAR(100),
    yield_amount NUMERIC(10,2),
    yield_unit VARCHAR(50),
    
    -- Difficulty
    difficulty VARCHAR(50) DEFAULT 'medium', -- easy, medium, hard, expert
    skill_level VARCHAR(100),
    
    -- Costing
    ingredient_cost INTEGER DEFAULT 0, -- cents
    labor_cost INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0,
    cost_per_serving INTEGER DEFAULT 0,
    suggested_price INTEGER,
    target_food_cost_percentage NUMERIC(5,2),
    
    -- Chef info
    chef_id UUID REFERENCES users(id) ON DELETE SET NULL,
    chef_notes TEXT,
    plating_instructions TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, testing, approved, archived
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    -- Allergens & dietary
    allergens TEXT[],
    dietary_tags TEXT[],
    
    -- Media
    primary_photo_url TEXT,
    video_url TEXT,
    
    -- Usage
    last_made_date TIMESTAMPTZ,
    popularity_score INTEGER DEFAULT 0,
    customer_rating NUMERIC(3,2),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipes_org ON recipes(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_status ON recipes(status) WHERE archived_at IS NULL;
CREATE INDEX idx_recipes_chef ON recipes(chef_id);
CREATE INDEX idx_recipes_name_search ON recipes USING gin(to_tsvector('english', name));

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    
    ingredient_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    preparation VARCHAR(200),
    is_optional BOOLEAN DEFAULT FALSE,
    is_garnish BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    section VARCHAR(100),
    unit_cost INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0,
    substitutions TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_inventory ON recipe_ingredients(inventory_item_id);

CREATE TRIGGER update_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration INTEGER,
    temperature NUMERIC(5,1),
    temperature_unit VARCHAR(1),
    equipment TEXT[],
    photo_url TEXT,
    video_url TEXT,
    chef_tip TEXT,
    common_mistakes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id, step_number);

CREATE TRIGGER update_recipe_steps_updated_at
    BEFORE UPDATE ON recipe_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_nutrition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    serving_size VARCHAR(100) NOT NULL,
    calories INTEGER NOT NULL,
    protein NUMERIC(6,2) NOT NULL,
    carbohydrates NUMERIC(6,2) NOT NULL,
    fat NUMERIC(6,2) NOT NULL,
    fiber NUMERIC(6,2),
    sugar NUMERIC(6,2),
    sodium NUMERIC(8,2),
    cholesterol NUMERIC(6,2),
    vitamin_a NUMERIC(5,2),
    vitamin_c NUMERIC(5,2),
    calcium NUMERIC(5,2),
    iron NUMERIC(5,2),
    contains_dairy BOOLEAN DEFAULT FALSE,
    contains_eggs BOOLEAN DEFAULT FALSE,
    contains_nuts BOOLEAN DEFAULT FALSE,
    contains_shellfish BOOLEAN DEFAULT FALSE,
    contains_gluten BOOLEAN DEFAULT FALSE,
    contains_soy BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_keto BOOLEAN DEFAULT FALSE,
    is_paleo BOOLEAN DEFAULT FALSE,
    is_dairy_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    CONSTRAINT unique_recipe_nutrition UNIQUE(recipe_id)
);

CREATE INDEX idx_recipe_nutrition_recipe ON recipe_nutrition(recipe_id);

CREATE TRIGGER update_recipe_nutrition_updated_at
    BEFORE UPDATE ON recipe_nutrition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    previous_version_id UUID REFERENCES recipe_versions(id) ON DELETE SET NULL,
    version_notes TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changes_summary TEXT,
    major_changes BOOLEAN DEFAULT FALSE,
    recipe_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_versions_recipe ON recipe_versions(recipe_id, version);

CREATE TRIGGER update_recipe_versions_updated_at
    BEFORE UPDATE ON recipe_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    photographer VARCHAR(200),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_photos_recipe ON recipe_photos(recipe_id);

CREATE TRIGGER update_recipe_photos_updated_at
    BEFORE UPDATE ON recipe_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS recipe_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    total_ingredient_cost INTEGER NOT NULL DEFAULT 0,
    ingredient_cost_per_serving INTEGER NOT NULL DEFAULT 0,
    prep_labor_cost INTEGER DEFAULT 0,
    cook_labor_cost INTEGER DEFAULT 0,
    total_labor_cost INTEGER DEFAULT 0,
    labor_cost_per_serving INTEGER DEFAULT 0,
    total_recipe_cost INTEGER NOT NULL DEFAULT 0,
    cost_per_serving INTEGER NOT NULL DEFAULT 0,
    suggested_price INTEGER,
    target_food_cost_percent NUMERIC(5,2),
    actual_food_cost_percent NUMERIC(5,2),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_recipe_costs_recipe ON recipe_costs(recipe_id);

CREATE TRIGGER update_recipe_costs_updated_at
    BEFORE UPDATE ON recipe_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
