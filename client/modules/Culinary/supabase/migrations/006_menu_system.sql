-- ============================================================================
-- Menu System Database Schema
-- Complete menu storage, versioning, and management system
-- Works with both Supabase and Neon PostgreSQL
-- ============================================================================

-- Create menu_drafts table (similar to recipe drafts)
CREATE TABLE IF NOT EXISTS public.menu_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Core menu data
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  
  -- Menu structure (JSON)
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  dishes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Design state (entire canvas state)
  canvas_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  design_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Font settings
  font_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Menu metadata
  cuisine_type VARCHAR(100),
  menu_type VARCHAR(50), -- "single-page", "multi-page", "digital", etc.
  target_audience VARCHAR(100),
  
  -- Business data
  currency VARCHAR(3) DEFAULT 'USD',
  business_season VARCHAR(50), -- "spring", "summer", "fall", "winter", "special-event"
  
  -- Versioning
  version_number INT DEFAULT 1,
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Access control
  visibility VARCHAR(50) DEFAULT 'private', -- "private", "team", "property", "all"
  shared_with UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT menu_title_not_empty CHECK (title != ''),
  CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'property', 'all'))
);

-- Create menus table (published/finalized menus)
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Core menu data
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  
  -- Menu structure
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  dishes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Design state
  canvas_state JSONB NOT NULL,
  design_metadata JSONB,
  font_settings JSONB,
  
  -- Menu type/metadata
  cuisine_type VARCHAR(100),
  menu_type VARCHAR(50),
  target_audience VARCHAR(100),
  
  -- Business data
  currency VARCHAR(3) DEFAULT 'USD',
  business_season VARCHAR(50),
  
  -- Dish links (to dish_assembly)
  dish_assembly_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Versioning
  version_number INT DEFAULT 1,
  draft_id UUID REFERENCES public.menu_drafts(id) ON DELETE SET NULL,
  
  -- Access control
  visibility VARCHAR(50) DEFAULT 'private',
  shared_with UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Publish status
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dates menu is active
  active_from DATE,
  active_to DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT menu_title_not_empty CHECK (title != ''),
  CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'property', 'all')),
  CONSTRAINT active_dates_valid CHECK (active_to IS NULL OR active_from IS NULL OR active_from <= active_to)
);

-- Create menu_versions table (historical tracking)
CREATE TABLE IF NOT EXISTS public.menu_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Version info
  version_number INT NOT NULL,
  change_log TEXT,
  
  -- Complete menu state snapshot
  menu_state JSONB NOT NULL,
  
  -- Performance tracking (filled in by POS)
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(menu_id, version_number)
);

-- Create menu_performance table (tracks sales/popularity per menu)
CREATE TABLE IF NOT EXISTS public.menu_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Performance data
  total_items_sold INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Item performance (JSON with item_id -> {sold, revenue, popularity_score})
  item_performance JSONB DEFAULT '{}'::jsonb,
  
  -- Category performance
  category_performance JSONB DEFAULT '{}'::jsonb,
  
  -- Dates
  data_from DATE NOT NULL,
  data_to DATE NOT NULL,
  
  -- Timestamps
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(menu_id, data_from, data_to)
);

-- Create menu_comparisons table (cross-property analytics)
CREATE TABLE IF NOT EXISTS public.menu_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id_1 UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  menu_id_2 UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  
  -- Comparison metrics
  similarity_score FLOAT,
  shared_items INT DEFAULT 0,
  unique_to_menu1 INT DEFAULT 0,
  unique_to_menu2 INT DEFAULT 0,
  
  -- Performance comparison
  menu1_performance JSONB,
  menu2_performance JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CHECK (menu_id_1 != menu_id_2)
);

-- Create operations_docs table (for menu documentation)
CREATE TABLE IF NOT EXISTS public.operations_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Document info
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) NOT NULL, -- "menu-guide", "prep-notes", "server-training", "plating-instructions"
  
  -- Content
  content TEXT NOT NULL,
  html_content TEXT,
  
  -- Links to menu (optional)
  menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
  related_menu_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Access control
  visibility VARCHAR(50) DEFAULT 'property', -- "private", "team", "property", "all"
  shared_with UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT title_not_empty CHECK (title != ''),
  CONSTRAINT doc_type_valid CHECK (doc_type IN ('menu-guide', 'prep-notes', 'server-training', 'plating-instructions', 'other')),
  CONSTRAINT visibility_valid CHECK (visibility IN ('private', 'team', 'property', 'all'))
);

-- Create export_logs table (track exports for audit)
CREATE TABLE IF NOT EXISTS public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  
  -- Export details
  export_format VARCHAR(50) NOT NULL, -- "pdf", "png", "psd", "svg", "ai"
  file_size INT, -- bytes
  file_path VARCHAR(500),
  
  -- Export settings
  include_bleeds BOOLEAN DEFAULT TRUE,
  include_marks BOOLEAN DEFAULT TRUE,
  color_space VARCHAR(20) DEFAULT 'CMYK',
  resolution_dpi INT DEFAULT 300,
  
  -- Destination
  printer_company VARCHAR(255),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT format_valid CHECK (export_format IN ('pdf', 'png', 'psd', 'svg', 'ai', 'json'))
);

-- Create menu_templates table (for reusable menu templates)
CREATE TABLE IF NOT EXISTS public.menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- "fine-dining", "casual", "bistro", "resort", etc.
  
  -- Template design (canvas state)
  template_design JSONB NOT NULL,
  font_presets JSONB NOT NULL,
  color_palette JSONB,
  
  -- Is system template or user-created
  is_system BOOLEAN DEFAULT FALSE,
  
  -- Tags for search
  tags VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR(255)[],
  
  -- Usage stats
  times_used INT DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT name_not_empty CHECK (name != '')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_menu_drafts_user_id ON public.menu_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_drafts_property_id ON public.menu_drafts(property_id);
CREATE INDEX IF NOT EXISTS idx_menu_drafts_updated_at ON public.menu_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_drafts_is_active ON public.menu_drafts(is_active);

CREATE INDEX IF NOT EXISTS idx_menus_user_id ON public.menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menus_property_id ON public.menus(property_id);
CREATE INDEX IF NOT EXISTS idx_menus_is_published ON public.menus(is_published);
CREATE INDEX IF NOT EXISTS idx_menus_season ON public.menus(business_season);
CREATE INDEX IF NOT EXISTS idx_menus_active_dates ON public.menus(active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_menus_published_at ON public.menus(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_versions_menu_id ON public.menu_versions(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_versions_version ON public.menu_versions(version_number DESC);

CREATE INDEX IF NOT EXISTS idx_menu_performance_menu_id ON public.menu_performance(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_performance_property_id ON public.menu_performance(property_id);
CREATE INDEX IF NOT EXISTS idx_menu_performance_dates ON public.menu_performance(data_from, data_to);

CREATE INDEX IF NOT EXISTS idx_operations_docs_property_id ON public.operations_docs(property_id);
CREATE INDEX IF NOT EXISTS idx_operations_docs_menu_id ON public.operations_docs(menu_id);
CREATE INDEX IF NOT EXISTS idx_operations_docs_doc_type ON public.operations_docs(doc_type);

CREATE INDEX IF NOT EXISTS idx_export_logs_menu_id ON public.export_logs(menu_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON public.export_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_templates_category ON public.menu_templates(category);
CREATE INDEX IF NOT EXISTS idx_menu_templates_is_system ON public.menu_templates(is_system);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active menus by property
CREATE OR REPLACE VIEW public.active_menus AS
SELECT 
  m.id,
  m.property_id,
  m.title,
  m.cuisine_type,
  m.menu_type,
  m.active_from,
  m.active_to,
  m.published_at,
  m.version_number
FROM public.menus m
WHERE m.is_published = TRUE
  AND (m.active_from IS NULL OR m.active_from <= CURRENT_DATE)
  AND (m.active_to IS NULL OR m.active_to >= CURRENT_DATE)
ORDER BY m.published_at DESC;

-- View for seasonal menu analysis
CREATE OR REPLACE VIEW public.seasonal_menu_analysis AS
SELECT 
  business_season,
  COUNT(*) as menu_count,
  AVG(version_number) as avg_versions,
  COUNT(DISTINCT property_id) as properties_using,
  COUNT(CASE WHEN is_published THEN 1 END) as published_count
FROM public.menus
GROUP BY business_season;

-- ============================================================================
-- POLICIES (RLS)
-- ============================================================================

-- Enable RLS on all menu tables
ALTER TABLE public.menu_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see menus they created or are shared with them
CREATE POLICY menu_select_policy ON public.menus
  FOR SELECT USING (
    user_id = auth.uid() 
    OR auth.uid() = ANY(shared_with)
    OR visibility = 'all'
  );

-- Policy: Users can create menus
CREATE POLICY menu_insert_policy ON public.menus
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own menus
CREATE POLICY menu_update_policy ON public.menus
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Similar policies for menu_drafts
CREATE POLICY menu_drafts_select_policy ON public.menu_drafts
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() = ANY(shared_with));

CREATE POLICY menu_drafts_insert_policy ON public.menu_drafts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY menu_drafts_update_policy ON public.menu_drafts
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Operations docs policies
CREATE POLICY operations_docs_select_policy ON public.operations_docs
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth.uid() = ANY(shared_with)
    OR visibility IN ('property', 'all')
  );

CREATE POLICY operations_docs_insert_policy ON public.operations_docs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY operations_docs_update_policy ON public.operations_docs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on menus
CREATE OR REPLACE FUNCTION update_menu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_updated_at_trigger
BEFORE UPDATE ON public.menus
FOR EACH ROW
EXECUTE FUNCTION update_menu_updated_at();

CREATE TRIGGER menu_draft_updated_at_trigger
BEFORE UPDATE ON public.menu_drafts
FOR EACH ROW
EXECUTE FUNCTION update_menu_updated_at();

-- Auto-increment version when menu is published
CREATE OR REPLACE FUNCTION increment_menu_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = TRUE AND OLD.is_published = FALSE THEN
    NEW.version_number = COALESCE(OLD.version_number, 0) + 1;
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_version_trigger
BEFORE UPDATE ON public.menus
FOR EACH ROW
EXECUTE FUNCTION increment_menu_version();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.menus IS 'Published/finalized menus with full design and business data';
COMMENT ON TABLE public.menu_drafts IS 'Draft menus being worked on';
COMMENT ON TABLE public.menu_versions IS 'Historical versions of published menus for tracking changes';
COMMENT ON TABLE public.menu_performance IS 'Sales and performance metrics for menus from POS integration';
COMMENT ON TABLE public.operations_docs IS 'Documentation files linked to menus (guides, prep notes, etc.)';
COMMENT ON TABLE public.export_logs IS 'Audit log of menu exports to track professional printing';
COMMENT ON TABLE public.menu_templates IS 'Reusable menu templates for quick menu creation';
