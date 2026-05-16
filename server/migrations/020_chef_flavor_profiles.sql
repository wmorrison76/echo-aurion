-- Migration: Chef Flavor Profile System
-- Purpose: Store chef flavor fingerprint matrices for recipe generation
-- Features: Chef profiles, recipe-to-profile linking, flavor matrix storage
-- Date: 2025-01-16

-- =====================================================
-- CHEF FLAVOR PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chef_flavor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chef identification (supports both name and cookbook)
  chef_name TEXT NOT NULL, -- e.g., "Thomas Keller"
  cookbook_name TEXT, -- e.g., "The French Laundry Cookbook"
  full_name TEXT NOT NULL, -- "Thomas Keller - The French Laundry Cookbook" (for display)
  
  organization_id UUID NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'imported', -- 'imported', 'user', 'generated'
  
  -- Flavor fingerprint matrix (aggregated from all recipes)
  flavor_matrix JSONB NOT NULL DEFAULT '{}', -- {
    -- ingredient_percentages: { ingredient_name: percentage }
    -- acid_base_ratio: { acid: number, base: number }
    -- protein_percentage: number
    -- flavor_attributes: [{ id: string, intensity: number, label: string }]
    -- complexity_score: number
    -- balance_score: number
    -- preferred_techniques: string[]
    -- signature_ingredients: string[]
    -- seasonal_weighting: { season: weight } (optional)
  -- }
  
  -- Statistics
  recipe_count INTEGER DEFAULT 0,
  last_recipe_analyzed_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  source_cookbook TEXT,
  source_url TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_chef_profile UNIQUE(full_name, organization_id)
);

CREATE INDEX idx_chef_profiles_org ON chef_flavor_profiles(organization_id);
CREATE INDEX idx_chef_profiles_chef_name ON chef_flavor_profiles(chef_name, organization_id);
CREATE INDEX idx_chef_profiles_full_name ON chef_flavor_profiles(full_name, organization_id);
CREATE INDEX idx_chef_profiles_type ON chef_flavor_profiles(profile_type);

-- =====================================================
-- RECIPE TO CHEF PROFILE LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS recipe_chef_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id TEXT, -- Can be NULL if recipe deleted
  recipe_title TEXT, -- Preserved even if recipe deleted
  chef_profile_id UUID NOT NULL REFERENCES chef_flavor_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  
  -- Recipe's contribution to profile (for tracking)
  flavor_contribution JSONB, -- Individual recipe's fingerprint
  weight DECIMAL DEFAULT 1.0, -- Weight for aggregation (newer = higher)
  seasonal_weight DECIMAL DEFAULT 1.0, -- Seasonal weighting multiplier
  
  -- Timestamps for weighting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Even if recipe deleted, this link remains
  recipe_deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_recipe_profile_link UNIQUE(recipe_id, chef_profile_id) WHERE recipe_id IS NOT NULL
);

CREATE INDEX idx_recipe_profile_links_profile ON recipe_chef_profile_links(chef_profile_id);
CREATE INDEX idx_recipe_profile_links_recipe ON recipe_chef_profile_links(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_recipe_profile_links_org ON recipe_chef_profile_links(organization_id);

-- =====================================================
-- BEO MISSING RECIPES TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS beo_missing_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beo_id UUID NOT NULL,
  beo_number TEXT NOT NULL, -- From beo-management.ts generateEnhancedBEONumber (AUR-[GL]-[YYYYMMDD]-[Type]-[Seq])
  organization_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  
  -- Missing recipe info
  menu_item_name TEXT NOT NULL,
  menu_item_id TEXT,
  course_type TEXT, -- 'appetizer', 'entree', 'dessert', etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'added', 'generated', 'skipped', 'remind_later'
  action_taken TEXT, -- 'added', 'generated', 'skipped', 'remind_later'
  
  -- Generated recipe info (if AI generated)
  generated_recipe_id TEXT,
  generation_chef_profile TEXT, -- Chef profile full_name used for generation
  generation_confidence_score DECIMAL, -- 0-1 (90% = 0.9)
  
  -- Flags
  is_ai_generated BOOLEAN DEFAULT false,
  requires_chef_review BOOLEAN DEFAULT false,
  chef_reviewed_at TIMESTAMP WITH TIME ZONE,
  chef_approved BOOLEAN,
  
  -- Notification tracking
  notified_at TIMESTAMP WITH TIME ZONE,
  reminded_at TIMESTAMP WITH TIME ZONE,
  notification_banner_shown BOOLEAN DEFAULT false, -- For >3 days without approval
  days_without_approval INTEGER DEFAULT 0,
  
  -- Metadata
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_beo_missing_recipes_beo ON beo_missing_recipes(beo_id);
CREATE INDEX idx_beo_missing_recipes_status ON beo_missing_recipes(status) WHERE status = 'pending';
CREATE INDEX idx_beo_missing_recipes_org ON beo_missing_recipes(organization_id, status);
CREATE INDEX idx_beo_missing_recipes_review ON beo_missing_recipes(requires_chef_review, chef_reviewed_at) WHERE requires_chef_review = true;
CREATE INDEX idx_beo_missing_recipes_notification ON beo_missing_recipes(notification_banner_shown, days_without_approval) WHERE requires_chef_review = true AND chef_reviewed_at IS NULL;
CREATE INDEX idx_beo_missing_recipes_beo_number ON beo_missing_recipes(beo_number);

-- =====================================================
-- RECIPE ORGANIZATION ENHANCEMENTS
-- =====================================================

-- Add columns to user_recipes table (if not exists)
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS profile_name TEXT; -- e.g., "Elate"
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS department_filter TEXT[]; -- ['pastry'], ['kitchen'], etc.
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS ai_generation_source TEXT; -- Chef profile full_name
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false;
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false; -- Global recipes (all outlets)
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS global_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS generation_confidence_score DECIMAL; -- 0-1

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_recipes_profile ON user_recipes(profile_name, organization_id) WHERE profile_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_recipes_department ON user_recipes USING GIN(department_filter) WHERE department_filter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_recipes_ai_generated ON user_recipes(is_ai_generated) WHERE is_ai_generated = true;
CREATE INDEX IF NOT EXISTS idx_user_recipes_global ON user_recipes(is_global, organization_id) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_user_recipes_review ON user_recipes(requires_review, organization_id) WHERE requires_review = true;
CREATE INDEX IF NOT EXISTS idx_user_recipes_confidence ON user_recipes(generation_confidence_score) WHERE generation_confidence_score IS NOT NULL;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE chef_flavor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_chef_profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE beo_missing_recipes ENABLE ROW LEVEL SECURITY;

-- Chef profiles: Org members can view, admins can manage
CREATE POLICY chef_profiles_select ON chef_flavor_profiles FOR SELECT
  USING (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY chef_profiles_insert ON chef_flavor_profiles FOR INSERT
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY chef_profiles_update ON chef_flavor_profiles FOR UPDATE
  USING (organization_id = auth.jwt() ->> 'org_id')
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

-- Recipe profile links: Org members can view, admins can manage
CREATE POLICY recipe_profile_links_select ON recipe_chef_profile_links FOR SELECT
  USING (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY recipe_profile_links_insert ON recipe_chef_profile_links FOR INSERT
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY recipe_profile_links_update ON recipe_chef_profile_links FOR UPDATE
  USING (organization_id = auth.jwt() ->> 'org_id')
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

-- BEO missing recipes: Org members can view, admins can manage
CREATE POLICY beo_missing_recipes_select ON beo_missing_recipes FOR SELECT
  USING (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY beo_missing_recipes_insert ON beo_missing_recipes FOR INSERT
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY beo_missing_recipes_update ON beo_missing_recipes FOR UPDATE
  USING (organization_id = auth.jwt() ->> 'org_id')
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Update updated_at timestamp for chef_flavor_profiles
CREATE OR REPLACE FUNCTION update_chef_flavor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chef_flavor_profiles_updated_at
BEFORE UPDATE ON chef_flavor_profiles
FOR EACH ROW
EXECUTE FUNCTION update_chef_flavor_profiles_updated_at();

-- Update updated_at timestamp for beo_missing_recipes
CREATE OR REPLACE FUNCTION update_beo_missing_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Calculate days_without_approval if requires_chef_review and not reviewed
  IF NEW.requires_chef_review = true AND NEW.chef_reviewed_at IS NULL THEN
    NEW.days_without_approval = EXTRACT(DAY FROM (NOW() - NEW.created_at))::INTEGER;
  ELSE
    NEW.days_without_approval = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beo_missing_recipes_updated_at
BEFORE UPDATE ON beo_missing_recipes
FOR EACH ROW
EXECUTE FUNCTION update_beo_missing_recipes_updated_at();

-- =====================================================
-- RECIPE SELECTION HISTORY TABLE (for learning)
-- =====================================================

CREATE TABLE IF NOT EXISTS recipe_selection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Selection info
  menu_item_name TEXT NOT NULL,
  selected_recipe_id TEXT NOT NULL,
  selected_recipe_name TEXT NOT NULL,
  match_score DECIMAL, -- 0-1, match score at time of selection
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_recipe_selection_org_menu ON recipe_selection_history(organization_id, menu_item_name);
CREATE INDEX idx_recipe_selection_recipe ON recipe_selection_history(selected_recipe_id);
CREATE INDEX idx_recipe_selection_created ON recipe_selection_history(created_at DESC);

-- RLS Policies
ALTER TABLE recipe_selection_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_selection_history_select ON recipe_selection_history FOR SELECT
  USING (organization_id = auth.jwt() ->> 'org_id');

CREATE POLICY recipe_selection_history_insert ON recipe_selection_history FOR INSERT
  WITH CHECK (organization_id = auth.jwt() ->> 'org_id');

-- =====================================================
-- HELPER FUNCTION: Calculate Seasonal Weight
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_seasonal_weight(
  recipe_created_at TIMESTAMP WITH TIME ZONE,
  current_season TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  month_num INTEGER;
  season TEXT;
  base_weight DECIMAL := 1.0;
BEGIN
  -- Extract month
  month_num := EXTRACT(MONTH FROM recipe_created_at);
  
  -- Determine season from month
  CASE
    WHEN month_num IN (12, 1, 2) THEN season := 'winter';
    WHEN month_num IN (3, 4, 5) THEN season := 'spring';
    WHEN month_num IN (6, 7, 8) THEN season := 'summer';
    WHEN month_num IN (9, 10, 11) THEN season := 'fall';
  END CASE;
  
  -- If current_season provided and matches, increase weight
  IF current_season IS NOT NULL AND current_season = season THEN
    base_weight := 1.2; -- 20% boost for seasonal recipes
  END IF;
  
  RETURN base_weight;
END;
$$ LANGUAGE plpgsql;
