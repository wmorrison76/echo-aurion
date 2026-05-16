/**
 * Kitchen Library Content Management System Schema
 * Enables content management, search, and organization for culinary knowledge
 */

-- =====================================================
-- KITCHEN LIBRARY CONTENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kitchen_library_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- NULL for system-wide content
  
  -- Content definition
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- "technique", "ingredient", "recipe", "tool", "history"
  type VARCHAR(50) NOT NULL, -- "article", "video", "image", "recipe", "technique", "reference"
  content TEXT NOT NULL, -- Markdown or HTML content
  
  -- Organization
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  author VARCHAR(255),
  source VARCHAR(255),
  
  -- Difficulty and mastery
  difficulty VARCHAR(50) NOT NULL, -- "beginner", "intermediate", "advanced", "expert", "master"
  mastery_level INTEGER NOT NULL CHECK (mastery_level BETWEEN 1 AND 5), -- 1=fundamental, 5=master
  
  -- Relationships
  related_content_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  
  -- Metadata
  metadata JSONB,
  
  -- Statistics
  views INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC CHECK (rating BETWEEN 0 AND 5),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_title_category UNIQUE (org_id, title, category)
);

CREATE INDEX idx_kitchen_library_content_org ON kitchen_library_content(org_id);
CREATE INDEX idx_kitchen_library_content_category ON kitchen_library_content(category);
CREATE INDEX idx_kitchen_library_content_type ON kitchen_library_content(type);
CREATE INDEX idx_kitchen_library_content_difficulty ON kitchen_library_content(difficulty);
CREATE INDEX idx_kitchen_library_content_mastery ON kitchen_library_content(mastery_level);
CREATE INDEX idx_kitchen_library_content_tags ON kitchen_library_content USING GIN (tags);
CREATE INDEX idx_kitchen_library_content_active ON kitchen_library_content(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_kitchen_library_content_views ON kitchen_library_content(views DESC);

-- Full-text search index
CREATE INDEX idx_kitchen_library_content_search ON kitchen_library_content USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, ''))
);

-- =====================================================
-- CONTENT LIBRARIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS content_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Library definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- Statistics
  content_count INTEGER NOT NULL DEFAULT 0,
  
  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_libraries_org ON content_libraries(org_id);
CREATE INDEX idx_content_libraries_category ON content_libraries(category);
CREATE INDEX idx_content_libraries_public ON content_libraries(is_public) WHERE is_public = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE kitchen_library_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_libraries ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY kitchen_library_content_tenant_isolation ON kitchen_library_content
  FOR ALL
  USING (org_id IS NULL OR org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY content_libraries_tenant_isolation ON content_libraries
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
