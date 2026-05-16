-- Migration: Recipe Scaling and Ingredient Tracking
-- Purpose: Scale recipes for events, generate ingredient lists, and link to purchasing
-- Date: 2025-01-01
-- Features: Recipe scaling, ingredient extraction, prep lists, PO generation

-- =====================================================
-- RECIPE INTEGRATION TABLE
-- =====================================================
-- Links production tasks to recipes
CREATE TABLE IF NOT EXISTS production_task_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Recipe reference (can be UUID if from Culinary, or text name)
  recipe_id UUID,
  recipe_name VARCHAR(255),
  recipe_source VARCHAR(50), -- 'culinary', 'manual', 'external'
  
  -- Scaling info
  original_yield INTEGER,  -- Original recipe yield (e.g., 4, 6, 8 servings)
  original_yield_unit VARCHAR(50), -- 'servings', 'portions', 'weight', 'pieces'
  target_yield INTEGER,    -- Scaled yield (e.g., 50 servings)
  target_yield_unit VARCHAR(50),
  
  scaling_factor NUMERIC(10,2), -- 2.5, 3.0, etc.
  
  -- Dates
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_recipes_task ON production_task_recipes(production_task_id);
CREATE INDEX IF NOT EXISTS idx_task_recipes_recipe ON production_task_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_task_recipes_active ON production_task_recipes(is_active);

-- =====================================================
-- SCALED INGREDIENT TABLE
-- =====================================================
-- Ingredients from recipes scaled for the event
CREATE TABLE IF NOT EXISTS scaled_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Ingredient details
  ingredient_name VARCHAR(255) NOT NULL,
  ingredient_id UUID,  -- Link to Culinary ingredient database if available
  
  -- Original quantity (from recipe)
  original_quantity NUMERIC(12,2),
  original_unit VARCHAR(50), -- 'cups', 'oz', 'grams', 'tbsp', 'tsp', 'pieces', etc.
  
  -- Scaled quantity (for event)
  scaled_quantity NUMERIC(12,2),
  scaled_unit VARCHAR(50),
  
  -- Purchasing info
  purchase_unit VARCHAR(50),  -- How it's sold (e.g., '#10 can', 'lb', 'case of 24')
  purchase_quantity_needed NUMERIC(12,2),  -- How many purchase units needed
  unit_cost NUMERIC(12,2),    -- Cost per purchase unit
  total_cost NUMERIC(12,2),   -- Total cost for event
  
  -- Supplier info (optional, can link to Purchasing module)
  preferred_supplier_id UUID,
  supplier_name VARCHAR(255),
  
  -- Status
  prep_notes TEXT,
  substitutions_allowed BOOLEAN DEFAULT TRUE,
  alternative_ingredients TEXT[],
  
  -- Inventory integration
  needs_special_order BOOLEAN DEFAULT FALSE,
  lead_time_days INTEGER,  -- Days needed to order
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_task ON scaled_ingredients(production_task_id);
CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_event ON scaled_ingredients(event_id);
CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_ingredient ON scaled_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_special_order ON scaled_ingredients(needs_special_order);

-- =====================================================
-- PREP LIST / MISE EN PLACE TABLE
-- =====================================================
-- Detailed prep work generated from recipes
CREATE TABLE IF NOT EXISTS prep_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  prep_day_date DATE,
  days_before_event INTEGER,
  
  -- Prep instruction
  prep_item_number INTEGER,
  prep_description VARCHAR(255) NOT NULL,
  
  -- Related ingredient
  ingredient_id UUID REFERENCES scaled_ingredients(id) ON DELETE SET NULL,
  ingredient_name VARCHAR(255),
  
  -- Timing
  estimated_duration_minutes INTEGER,
  can_be_done_in_advance BOOLEAN DEFAULT TRUE,
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prep_list_task ON prep_list_items(production_task_id);
CREATE INDEX IF NOT EXISTS idx_prep_list_date ON prep_list_items(prep_day_date);
CREATE INDEX IF NOT EXISTS idx_prep_list_status ON prep_list_items(status);

-- =====================================================
-- RECIPE ANALYSIS LOG TABLE
-- =====================================================
-- Track AI analysis of recipes
CREATE TABLE IF NOT EXISTS recipe_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Recipe info
  recipe_id UUID,
  recipe_name VARCHAR(255),
  
  -- Analysis details
  analysis_type VARCHAR(50), -- 'ingredient_extraction', 'scaling', 'prep_analysis'
  ai_model VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc.
  
  -- Input/Output
  input_data JSONB,  -- Original recipe/request
  analysis_result JSONB,  -- AI response
  
  -- Validation
  was_validated BOOLEAN DEFAULT FALSE,
  validation_notes TEXT,
  validated_by UUID,
  
  -- Status
  status VARCHAR(30), -- 'success', 'partial', 'failed', 'pending_review'
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_task ON recipe_analysis_logs(production_task_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_recipe ON recipe_analysis_logs(recipe_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_status ON recipe_analysis_logs(status);

-- =====================================================
-- PURCHASE ORDER GENERATION TABLE
-- =====================================================
-- Links ingredient lists to purchase orders (Purchasing module)
CREATE TABLE IF NOT EXISTS event_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- PO reference
  purchase_order_id UUID,  -- Link to Purchasing module PO
  po_number VARCHAR(50),
  
  -- Dates
  needed_by_date DATE,
  ordered_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  po_status VARCHAR(30), -- 'draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled'
  
  -- Details
  total_cost NUMERIC(12,2),
  supplier_id UUID,
  supplier_name VARCHAR(255),
  
  -- Notes
  special_instructions TEXT,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_event_pos_task ON event_purchase_orders(production_task_id);
CREATE INDEX IF NOT EXISTS idx_event_pos_event ON event_purchase_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_pos_status ON event_purchase_orders(po_status);
CREATE INDEX IF NOT EXISTS idx_event_pos_needed_by ON event_purchase_orders(needed_by_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_task_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaled_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Org-level isolation
CREATE POLICY task_recipes_view_policy ON production_task_recipes
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY scaled_ingredients_view_policy ON scaled_ingredients
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY prep_list_view_policy ON prep_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maestro_production_tasks
      WHERE id = production_task_id
        AND org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY analysis_logs_view_policy ON recipe_analysis_logs
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY event_pos_view_policy ON event_purchase_orders
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- HELPER FUNCTION: Calculate scaled quantity
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_scaled_quantity(
  p_original_quantity NUMERIC,
  p_scaling_factor NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(p_original_quantity * p_scaling_factor, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Generate prep list from scaled ingredients
-- =====================================================

CREATE OR REPLACE FUNCTION generate_prep_list_from_ingredients(
  p_production_task_id UUID,
  p_event_id UUID
) RETURNS TABLE (prep_item_count INTEGER) AS $$
DECLARE
  v_count INTEGER := 0;
  v_ingredient RECORD;
  v_prep_day_date DATE;
  v_item_num INTEGER := 1;
BEGIN
  -- Get ingredients for this task
  FOR v_ingredient IN
    SELECT id, ingredient_name, scaled_quantity, scaled_unit, prep_notes
    FROM scaled_ingredients
    WHERE production_task_id = p_production_task_id
  LOOP
    -- Add prep item for each ingredient
    INSERT INTO prep_list_items (
      id,
      production_task_id,
      event_id,
      prep_day_date,
      prep_item_number,
      prep_description,
      ingredient_id,
      ingredient_name,
      estimated_duration_minutes,
      status,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_production_task_id,
      p_event_id,
      (SELECT execution_date FROM maestro_production_tasks WHERE id = p_production_task_id),
      v_item_num,
      'Prepare ' || v_ingredient.ingredient_name || ' (' || v_ingredient.scaled_quantity || ' ' || v_ingredient.scaled_unit || ')',
      v_ingredient.id,
      v_ingredient.ingredient_name,
      30,
      'pending',
      NOW()
    );
    
    v_count := v_count + 1;
    v_item_num := v_item_num + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_recipe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recipe_timestamp
BEFORE UPDATE ON production_task_recipes
FOR EACH ROW
EXECUTE FUNCTION update_recipe_timestamp();

CREATE TRIGGER trigger_update_ingredients_timestamp
BEFORE UPDATE ON scaled_ingredients
FOR EACH ROW
EXECUTE FUNCTION update_recipe_timestamp();

CREATE TRIGGER trigger_update_pos_timestamp
BEFORE UPDATE ON event_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_recipe_timestamp();

COMMIT;
