-- Figma Phase 2 Schema: Canvas Elements, Inspector, and AI Asset Lab
-- Extends figma-schema.sql with canvas drawing, property management, and AI assets

-- Enable UUID extension (already enabled in figma-schema.sql)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== CANVAS ELEMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_canvas_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  
  -- Element metadata
  element_id TEXT UNIQUE NOT NULL,
  element_type TEXT NOT NULL CHECK (element_type IN ('rectangle', 'circle', 'polygon', 'line', 'path', 'text', 'image', 'group', 'component')),
  name TEXT NOT NULL,
  
  -- Geometry
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  height DECIMAL NOT NULL,
  rotation DECIMAL DEFAULT 0,
  
  -- Appearance
  opacity DECIMAL DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  blend_mode TEXT DEFAULT 'normal' CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay', 'lighten', 'darken', 'color-dodge', 'color-burn')),
  visible BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  
  -- Fill
  fill_type TEXT CHECK (fill_type IN ('solid', 'gradient', 'image')),
  fill_color TEXT,
  fill_opacity DECIMAL DEFAULT 1.0,
  
  -- Stroke
  stroke_color TEXT,
  stroke_width DECIMAL DEFAULT 1,
  stroke_type TEXT DEFAULT 'solid' CHECK (stroke_type IN ('solid', 'dashed', 'dotted')),
  
  -- Border radius
  border_radius DECIMAL,
  
  -- Text (if type = 'text')
  text_content TEXT,
  font_family TEXT,
  font_size DECIMAL,
  font_weight TEXT,
  font_style TEXT,
  text_color TEXT,
  text_align TEXT,
  line_height DECIMAL,
  
  -- Image (if type = 'image')
  image_url TEXT,
  
  -- Metadata
  parent_id UUID REFERENCES public.figma_canvas_elements(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_canvas_elements_file_id ON public.figma_canvas_elements(file_id);
CREATE INDEX idx_figma_canvas_elements_user_id ON public.figma_canvas_elements(user_id);
CREATE INDEX idx_figma_canvas_elements_parent_id ON public.figma_canvas_elements(parent_id);

-- ===== CANVAS HISTORY TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_canvas_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  
  -- Version tracking
  version_number INT NOT NULL,
  snapshot_data JSONB NOT NULL,
  change_description TEXT,
  
  -- Undo/Redo
  action TEXT NOT NULL CHECK (action IN ('add', 'update', 'delete', 'group', 'move', 'resize', 'rotate')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.figma_users(id)
);

CREATE INDEX idx_figma_canvas_history_file_id ON public.figma_canvas_history(file_id);
CREATE INDEX idx_figma_canvas_history_created_by ON public.figma_canvas_history(created_by);

-- ===== AI GENERATED ASSETS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_ai_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Asset metadata
  name TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('icon', 'illustration', 'pattern', 'component', 'color-palette', 'typography')),
  
  -- Content
  svg_data TEXT,
  image_url TEXT,
  color_palette TEXT[],
  
  -- AI generation info
  generation_prompt TEXT NOT NULL,
  generation_style TEXT,
  generation_model TEXT DEFAULT 'gpt-4-turbo',
  tokens_used INT,
  
  -- Organization
  tags TEXT[],
  favorite BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_ai_assets_user_id ON public.figma_ai_assets(user_id);
CREATE INDEX idx_figma_ai_assets_asset_type ON public.figma_ai_assets(asset_type);
CREATE INDEX idx_figma_ai_assets_tags ON public.figma_ai_assets USING GIN(tags);
CREATE INDEX idx_figma_ai_assets_favorite ON public.figma_ai_assets(favorite);

-- ===== AI ASSET VARIANTS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_ai_asset_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_asset_id UUID NOT NULL REFERENCES public.figma_ai_assets(id) ON DELETE CASCADE,
  
  -- Variant content
  svg_data TEXT,
  image_url TEXT,
  color_palette TEXT[],
  
  -- Variant info
  variant_number INT NOT NULL,
  description TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(parent_asset_id, variant_number)
);

CREATE INDEX idx_figma_ai_asset_variants_parent ON public.figma_ai_asset_variants(parent_asset_id);

-- ===== DESIGN SYSTEM TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_design_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  
  -- System info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Colors
  primary_colors TEXT[],
  secondary_colors TEXT[],
  neutral_colors TEXT[],
  
  -- Typography
  font_families TEXT[],
  font_sizes DECIMAL[],
  line_heights DECIMAL[],
  
  -- Components
  component_count INT DEFAULT 0,
  icon_count INT DEFAULT 0,
  pattern_count INT DEFAULT 0,
  
  -- Analysis
  consistency_score DECIMAL DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_design_systems_file_id ON public.figma_design_systems(file_id);
CREATE INDEX idx_figma_design_systems_user_id ON public.figma_design_systems(user_id);

-- ===== ELEMENT PROPERTIES TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_element_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES public.figma_canvas_elements(id) ON DELETE CASCADE,
  
  -- Property groups
  property_group TEXT NOT NULL CHECK (property_group IN ('design', 'content', 'effects', 'interaction')),
  property_name TEXT NOT NULL,
  property_value JSONB NOT NULL,
  
  -- Metadata
  locked BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(element_id, property_group, property_name)
);

CREATE INDEX idx_figma_element_properties_element_id ON public.figma_element_properties(element_id);

-- ===== ELEMENT SHADOWS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_element_shadows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element_id UUID NOT NULL REFERENCES public.figma_canvas_elements(id) ON DELETE CASCADE,
  
  -- Shadow properties
  offset_x DECIMAL NOT NULL,
  offset_y DECIMAL NOT NULL,
  blur_radius DECIMAL NOT NULL,
  spread_radius DECIMAL DEFAULT 0,
  color TEXT NOT NULL,
  opacity DECIMAL DEFAULT 0.5,
  
  -- Metadata
  shadow_order INT NOT NULL,
  
  UNIQUE(element_id, shadow_order)
);

CREATE INDEX idx_figma_element_shadows_element_id ON public.figma_element_shadows(element_id);

-- ===== DESIGN TOKENS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_design_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_system_id UUID NOT NULL REFERENCES public.figma_design_systems(id) ON DELETE CASCADE,
  
  -- Token info
  token_name TEXT NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('color', 'typography', 'spacing', 'sizing', 'border-radius', 'shadow')),
  
  -- Value
  token_value JSONB NOT NULL,
  
  -- Metadata
  description TEXT,
  category TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(design_system_id, token_name)
);

CREATE INDEX idx_figma_design_tokens_system_id ON public.figma_design_tokens(design_system_id);
CREATE INDEX idx_figma_design_tokens_type ON public.figma_design_tokens(token_type);

-- ===== ROW LEVEL SECURITY POLICIES =====

-- Canvas elements RLS
ALTER TABLE public.figma_canvas_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own canvas elements" ON public.figma_canvas_elements
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own canvas elements" ON public.figma_canvas_elements
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own canvas elements" ON public.figma_canvas_elements
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own canvas elements" ON public.figma_canvas_elements
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Canvas history RLS
ALTER TABLE public.figma_canvas_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own canvas history" ON public.figma_canvas_history
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own canvas history" ON public.figma_canvas_history
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- AI assets RLS
ALTER TABLE public.figma_ai_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI assets" ON public.figma_ai_assets
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own AI assets" ON public.figma_ai_assets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own AI assets" ON public.figma_ai_assets
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own AI assets" ON public.figma_ai_assets
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ===== TRIGGERS =====

-- Update timestamps on canvas elements
CREATE OR REPLACE FUNCTION update_figma_canvas_elements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER figma_canvas_elements_timestamp_trigger
BEFORE UPDATE ON public.figma_canvas_elements
FOR EACH ROW
EXECUTE FUNCTION update_figma_canvas_elements_timestamp();

-- Update design system consistency score
CREATE OR REPLACE FUNCTION update_design_system_consistency()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.figma_design_systems
  SET consistency_score = CASE 
    WHEN array_length(NEW.color_palette, 1) <= 5 THEN 100
    WHEN array_length(NEW.color_palette, 1) <= 10 THEN 80
    ELSE 60
  END,
  last_analyzed = NOW()
  WHERE id = (SELECT design_system_id FROM public.figma_ai_assets WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER figma_design_system_consistency_trigger
AFTER INSERT OR UPDATE ON public.figma_ai_assets
FOR EACH ROW
EXECUTE FUNCTION update_design_system_consistency();
