-- TIER 1 ENTERPRISE FEATURES SCHEMA
-- Batch Operations, SEO Generator, Content Relations, Analytics, Asset Management

-- ===== 1. BATCH OPERATIONS =====
CREATE TABLE IF NOT EXISTS public.cms_batch_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- edit, delete, publish, unpublish
  content_ids UUID[] NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb, -- The changes to apply
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== 2. CONTENT RELATIONS =====
CREATE TABLE IF NOT EXISTS public.cms_content_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL, -- references, related, ingredients, requires, depends_on
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_content_id, target_content_id, relation_type)
);

-- ===== 3. SEO METADATA =====
CREATE TABLE IF NOT EXISTS public.cms_seo_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL UNIQUE REFERENCES public.cms_content(id) ON DELETE CASCADE,
  title VARCHAR(60),
  meta_description VARCHAR(160),
  keywords VARCHAR(255),
  og_title VARCHAR(100),
  og_description VARCHAR(160),
  og_image_url VARCHAR(500),
  twitter_card VARCHAR(50), -- summary, summary_large_image
  canonical_url VARCHAR(500),
  robots TEXT, -- index, noindex, follow, nofollow
  structured_data JSONB, -- JSON-LD for schema.org
  keyword_density JSONB, -- Analysis results
  readability_score INTEGER, -- 0-100
  generated_by VARCHAR(100), -- 'ai' or 'manual'
  ai_suggestions JSONB, -- Recommendations from AI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== 4. ASSET MANAGEMENT =====
CREATE TABLE IF NOT EXISTS public.cms_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL, -- image/jpeg, image/png, etc.
  mime_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL UNIQUE,
  storage_provider VARCHAR(50) DEFAULT 'supabase', -- supabase, s3, cloudinary
  url VARCHAR(500) NOT NULL,
  dimensions JSONB, -- {width, height} for images
  alt_text VARCHAR(255),
  tags VARCHAR(255)[] DEFAULT ARRAY[]::varchar[],
  description TEXT,
  asset_type VARCHAR(50) NOT NULL, -- image, video, document, audio
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== 5. ASSET VERSIONS =====
CREATE TABLE IF NOT EXISTS public.cms_asset_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.cms_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  dimensions JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(asset_id, version_number)
);

-- ===== 6. ASSET USAGE TRACKING =====
CREATE TABLE IF NOT EXISTS public.cms_asset_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.cms_assets(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  usage_context VARCHAR(100), -- image, cover_image, thumbnail, video
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== 7. ENHANCED ANALYTICS =====
CREATE TABLE IF NOT EXISTS public.cms_content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL UNIQUE REFERENCES public.cms_content(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  average_time_on_page INTEGER DEFAULT 0, -- seconds
  bounce_rate FLOAT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  engagement_score INTEGER DEFAULT 0, -- 0-100
  share_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  trending_score FLOAT DEFAULT 0, -- Higher = more trending
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== 8. CONTENT EXPORT LOGS =====
CREATE TABLE IF NOT EXISTS public.cms_export_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  content_ids UUID[],
  export_format VARCHAR(50), -- pdf, csv, json, xml
  file_name VARCHAR(255),
  file_size INTEGER,
  storage_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'completed', -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_batch_ops_user ON public.cms_batch_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_ops_status ON public.cms_batch_operations(status);
CREATE INDEX IF NOT EXISTS idx_content_relations_source ON public.cms_content_relations(source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_relations_target ON public.cms_content_relations(target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_relations_type ON public.cms_content_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_seo_metadata_content ON public.cms_seo_metadata(content_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.cms_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON public.cms_assets(tags);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON public.cms_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON public.cms_asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_asset ON public.cms_asset_usage(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_content ON public.cms_asset_usage(content_id);
CREATE INDEX IF NOT EXISTS idx_performance_trending ON public.cms_content_performance(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_user ON public.cms_export_logs(user_id);

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION increment_asset_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cms_assets SET usage_count = usage_count + 1 WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_usage_increment AFTER INSERT ON public.cms_asset_usage
  FOR EACH ROW EXECUTE FUNCTION increment_asset_usage();

-- Trigger to update performance trending score
CREATE OR REPLACE FUNCTION update_trending_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trending_score = (
    (NEW.views * 0.3) +
    (NEW.likes * 2) +
    (NEW.comments_count * 3) +
    (NEW.share_count * 4)
  ) / 100.0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_trending BEFORE UPDATE ON public.cms_content_performance
  FOR EACH ROW EXECUTE FUNCTION update_trending_score();
