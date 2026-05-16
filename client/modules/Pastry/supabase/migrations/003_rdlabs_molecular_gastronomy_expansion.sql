-- R&D Labs Molecular Gastronomy Expansion
-- Phase 2: Advanced features for molecular gastronomy research

-- ============ TECHNIQUE LIBRARY ============

CREATE TABLE IF NOT EXISTS technique_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN (
    'spherification', 'gelification', 'foams', 'emulsions', 
    'caviar', 'powder', 'air', 'foam', 'gel', 'sphere',
    'tuile', 'crumble', 'other'
  )) NOT NULL,
  description TEXT,
  base_procedure TEXT,
  equipment_required TEXT[],
  typical_temperature_range TEXT,
  typical_time_range TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  safety_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ EQUIPMENT & TOOLS ============

CREATE TABLE IF NOT EXISTS equipment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  equipment_type TEXT CHECK (equipment_type IN (
    'precision_scale', 'thermometer', 'densimeter', 'viscometer',
    'rotavap', 'immersion_circulator', 'centrifuge', 'sonication',
    'sous_vide', 'combi_oven', 'smoking_gun', 'spherification_kit',
    'gelation_kit', 'foam_equipment', 'vacuum_machine', 'other'
  )) NOT NULL,
  manufacturer TEXT,
  model TEXT,
  precision NUMERIC,
  precision_unit TEXT,
  calibrated_at TIMESTAMP WITH TIME ZONE,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  maintenance_notes TEXT,
  location TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ ADVANCED MEASUREMENTS ============

CREATE TABLE IF NOT EXISTS measurement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  measurement_type TEXT CHECK (measurement_type IN (
    'temperature', 'ph', 'pressure', 'viscosity', 'density',
    'timing', 'weight', 'volume', 'concentration', 'other'
  )) NOT NULL,
  parameter_name TEXT NOT NULL,
  baseline_value NUMERIC,
  baseline_unit TEXT,
  test_values NUMERIC[],
  test_units TEXT,
  measurement_equipment_id UUID REFERENCES equipment_inventory(id),
  measurement_frequency TEXT,
  data_points JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ CHEMICAL COMPOUND TRACKING ============

CREATE TABLE IF NOT EXISTS chemical_compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compound_name TEXT NOT NULL,
  chemical_formula TEXT,
  cas_number TEXT,
  supplier TEXT,
  hazard_classification TEXT CHECK (hazard_classification IN (
    'non_hazardous', 'low', 'moderate', 'high', 'severe'
  )),
  sds_url TEXT,
  storage_conditions TEXT,
  storage_temperature_min NUMERIC,
  storage_temperature_max NUMERIC,
  handling_notes TEXT,
  concentration_used NUMERIC,
  concentration_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_compound_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  compound_id UUID NOT NULL REFERENCES chemical_compounds(id) ON DELETE CASCADE,
  quantity_used NUMERIC,
  unit TEXT,
  application_notes TEXT,
  safety_precautions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ ENHANCED SENSORY EVALUATION ============

CREATE TABLE IF NOT EXISTS sensory_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evaluator_name TEXT,
  evaluator_id UUID REFERENCES auth.users(id),
  
  -- Texture Evaluation
  texture_viscosity_scale NUMERIC CHECK (texture_viscosity_scale >= 1 AND texture_viscosity_scale <= 10),
  texture_gel_strength_scale NUMERIC CHECK (texture_gel_strength_scale >= 1 AND texture_gel_strength_scale <= 10),
  texture_pourability_scale NUMERIC CHECK (texture_pourability_scale >= 1 AND texture_pourability_scale <= 10),
  texture_mouthfeel_description TEXT,
  texture_notes TEXT,
  
  -- Flavor Profile
  flavor_intensity_scale NUMERIC CHECK (flavor_intensity_scale >= 1 AND flavor_intensity_scale <= 10),
  flavor_primary_notes TEXT[],
  flavor_secondary_notes TEXT[],
  flavor_balance_description TEXT,
  sweet_salt_balance NUMERIC CHECK (sweet_salt_balance >= 1 AND sweet_salt_balance <= 10),
  bitter_fat_balance NUMERIC CHECK (bitter_fat_balance >= 1 AND bitter_fat_balance <= 10),
  acid_umami_balance NUMERIC CHECK (acid_umami_balance >= 1 AND acid_umami_balance <= 10),
  
  -- Aroma Profile
  aroma_intensity_scale NUMERIC CHECK (aroma_intensity_scale >= 1 AND aroma_intensity_scale <= 10),
  aroma_primary_notes TEXT[],
  aroma_secondary_notes TEXT[],
  retronasal_aroma_description TEXT,
  
  -- Overall Assessment
  overall_rating NUMERIC CHECK (overall_rating >= 1 AND overall_rating <= 10),
  visual_appeal_description TEXT,
  comments TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ SCALING & BATCH CALCULATIONS ============

CREATE TABLE IF NOT EXISTS batch_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  lab_batch_size NUMERIC,
  lab_batch_unit TEXT,
  production_target_size NUMERIC,
  production_target_unit TEXT,
  scaling_ratio NUMERIC,
  
  -- Ingredient scaling data
  ingredients_scaling JSONB,  -- { ingredient_name: { lab_qty: X, lab_unit: Y, production_qty: Z, production_unit: W, scaling_notes: "" } }
  
  -- Yield calculations
  lab_yield_percentage NUMERIC,
  projected_production_yield_percentage NUMERIC,
  waste_percentage NUMERIC,
  
  -- Cost calculations
  lab_ingredient_cost NUMERIC,
  projected_production_cost NUMERIC,
  cost_per_unit_lab NUMERIC,
  cost_per_unit_production NUMERIC,
  currency TEXT,
  
  -- Equipment requirements for scaling
  production_equipment_needed TEXT[],
  equipment_notes TEXT,
  
  scaling_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ SAFETY & COMPLIANCE ============

CREATE TABLE IF NOT EXISTS safety_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  
  -- Chemical handling
  chemicals_involved TEXT[],
  hazard_level TEXT CHECK (hazard_level IN ('low', 'moderate', 'high')),
  safety_procedures_reviewed BOOLEAN DEFAULT false,
  ppe_required TEXT[],
  ventilation_required BOOLEAN,
  temperature_monitoring_required BOOLEAN,
  pressure_monitoring_required BOOLEAN,
  
  -- Temperature/time safety protocols
  safe_temperature_min NUMERIC,
  safe_temperature_max NUMERIC,
  max_exposure_time_minutes NUMERIC,
  cooling_procedure TEXT,
  
  -- Allergen tracking
  allergens_present TEXT[],
  allergen_cross_contamination_risk BOOLEAN,
  allergen_notes TEXT,
  
  -- Dietary accommodations
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  gluten_free BOOLEAN,
  dairy_free BOOLEAN,
  nut_free BOOLEAN,
  
  -- Environmental considerations
  waste_disposal_notes TEXT,
  environmental_impact_assessment TEXT,
  
  -- Compliance checklist
  health_department_reviewed BOOLEAN,
  allergen_labeling_required BOOLEAN,
  documentation_complete BOOLEAN,
  
  reviewed_by_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  compliance_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ MEDIA & DOCUMENTATION ============

CREATE TABLE IF NOT EXISTS experiment_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  media_type TEXT CHECK (media_type IN ('photo', 'video', 'diagram', 'molecular_structure', 'chart')) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_format TEXT,
  
  -- Photo/Video metadata
  capture_date TIMESTAMP WITH TIME ZONE,
  capture_step_description TEXT,
  capture_notes TEXT,
  
  -- Molecular structure specifics
  compound_name TEXT,
  structure_description TEXT,
  
  -- Chart specifics
  chart_title TEXT,
  chart_type TEXT,
  
  uploaded_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ RESEARCH DOCUMENT EXPORT ============

CREATE TABLE IF NOT EXISTS research_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN (
    'protocol', 'lab_report', 'preliminary_findings', 
    'final_report', 'implementation_guide', 'other'
  )) NOT NULL,
  content JSONB,  -- Full research document structure
  
  -- Export tracking
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exported_by_id UUID REFERENCES auth.users(id),
  export_format TEXT CHECK (export_format IN ('json', 'pdf', 'markdown', 'docx')),
  
  -- Recipe export data
  linked_recipe_id UUID,
  recipe_export_status TEXT CHECK (recipe_export_status IN (
    'pending', 'ready_for_export', 'exported', 'implemented'
  )) DEFAULT 'pending',
  recipe_export_date TIMESTAMP WITH TIME ZONE,
  export_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ INDEXES FOR PERFORMANCE ============

CREATE INDEX IF NOT EXISTS technique_library_category ON technique_library(category);
CREATE INDEX IF NOT EXISTS equipment_inventory_user_id ON equipment_inventory(user_id);
CREATE INDEX IF NOT EXISTS equipment_inventory_type ON equipment_inventory(equipment_type);
CREATE INDEX IF NOT EXISTS measurement_profiles_experiment_id ON measurement_profiles(experiment_id);
CREATE INDEX IF NOT EXISTS measurement_profiles_type ON measurement_profiles(measurement_type);
CREATE INDEX IF NOT EXISTS chemical_compounds_hazard ON chemical_compounds(hazard_classification);
CREATE INDEX IF NOT EXISTS experiment_compound_usage_experiment_id ON experiment_compound_usage(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_compound_usage_compound_id ON experiment_compound_usage(compound_id);
CREATE INDEX IF NOT EXISTS sensory_profiles_experiment_id ON sensory_profiles(experiment_id);
CREATE INDEX IF NOT EXISTS sensory_profiles_evaluator_id ON sensory_profiles(evaluator_id);
CREATE INDEX IF NOT EXISTS batch_calculations_experiment_id ON batch_calculations(experiment_id);
CREATE INDEX IF NOT EXISTS safety_compliance_experiment_id ON safety_compliance(experiment_id);
CREATE INDEX IF NOT EXISTS safety_compliance_hazard_level ON safety_compliance(hazard_level);
CREATE INDEX IF NOT EXISTS experiment_media_experiment_id ON experiment_media(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_media_type ON experiment_media(media_type);
CREATE INDEX IF NOT EXISTS research_documents_experiment_id ON research_documents(experiment_id);
CREATE INDEX IF NOT EXISTS research_documents_recipe_id ON research_documents(linked_recipe_id);
CREATE INDEX IF NOT EXISTS research_documents_status ON research_documents(recipe_export_status);

-- ============ ROW-LEVEL SECURITY ============

ALTER TABLE technique_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_compound_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_documents ENABLE ROW LEVEL SECURITY;

-- Technique Library: Public read, authenticated write
CREATE POLICY "technique_library_read" ON technique_library
  FOR SELECT USING (true);

CREATE POLICY "technique_library_write" ON technique_library
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Equipment: Users can manage their own
CREATE POLICY "equipment_inventory_own" ON equipment_inventory
  FOR ALL USING (auth.uid() = user_id);

-- Measurement Profiles: Inherit from experiment
CREATE POLICY "measurement_profiles_access" ON measurement_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = measurement_profiles.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- Sensory Profiles: Inherit from experiment
CREATE POLICY "sensory_profiles_access" ON sensory_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = sensory_profiles.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- Batch Calculations: Inherit from experiment
CREATE POLICY "batch_calculations_access" ON batch_calculations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = batch_calculations.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- Safety Compliance: Inherit from experiment
CREATE POLICY "safety_compliance_access" ON safety_compliance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = safety_compliance.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- Media: Inherit from experiment
CREATE POLICY "experiment_media_access" ON experiment_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_media.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- Research Documents: Inherit from experiment
CREATE POLICY "research_documents_access" ON research_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = research_documents.experiment_id
      AND (auth.uid() = experiments.user_id OR EXISTS (
        SELECT 1 FROM experiment_access
        WHERE experiment_access.experiment_id = experiments.id
        AND experiment_access.user_id = auth.uid()
      ))
    )
  );

-- ============ TRIGGERS FOR TIMESTAMPS ============

CREATE OR REPLACE FUNCTION update_technique_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_technique_library_timestamp ON technique_library;
CREATE TRIGGER update_technique_library_timestamp
BEFORE UPDATE ON technique_library
FOR EACH ROW
EXECUTE FUNCTION update_technique_library_timestamp();

CREATE OR REPLACE FUNCTION update_measurement_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_measurement_profiles_timestamp ON measurement_profiles;
CREATE TRIGGER update_measurement_profiles_timestamp
BEFORE UPDATE ON measurement_profiles
FOR EACH ROW
EXECUTE FUNCTION update_measurement_profiles_timestamp();

-- ============ PERMISSIONS ============

GRANT SELECT, INSERT, UPDATE, DELETE ON technique_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON measurement_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chemical_compounds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_compound_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sensory_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON batch_calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_compliance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON research_documents TO authenticated;
