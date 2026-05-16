-- CMS Content Management System Schema
-- Supports LUCCCA hospitality domain models with publishing workflows

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content Types Table
CREATE TABLE IF NOT EXISTS public.cms_content_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_builtin BOOLEAN DEFAULT true,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- LUCCCA Domain Models as Content Types
INSERT INTO public.cms_content_types (name, label, description, icon, fields) VALUES
('article', 'Articles', 'Blog posts and documentation', 'FileText', '{"title": "text", "slug": "text", "content": "richtext", "excerpt": "text", "cover_image": "image", "tags": "array"}'),
('event', 'Events', 'Hospitality events and occasions', 'Calendar', '{"title": "text", "date": "date", "location": "text", "guest_count": "number", "event_type": "select", "status": "select"}'),
('recipe', 'Recipes', 'Menu recipes and instructions', 'UtensilsCrossed', '{"name": "text", "cuisine": "select", "ingredients": "array", "instructions": "richtext", "prep_time": "number", "cook_time": "number", "servings": "number"}'),
('menu_item', 'Menu Items', 'Items on menus with pricing', 'Utensils', '{"name": "text", "description": "text", "price": "number", "category": "select", "allergens": "array", "dietary": "array", "image": "image"}'),
('guest_profile', 'Guest Profiles', 'Guest information and preferences', 'Users', '{"name": "text", "email": "email", "phone": "phone", "preferences": "text", "allergens": "array", "dietary_restrictions": "array", "vip_status": "select"}'),
('booking', 'Bookings', 'Event bookings and reservations', 'BookOpen', '{"guest_id": "reference", "event_id": "reference", "date": "date", "seats": "number", "status": "select", "special_requests": "text", "payment_status": "select"}'),
('allergen_profile', 'Allergen Profiles', 'Allergen tracking and management', 'AlertTriangle', '{"name": "text", "severity": "select", "description": "text", "affected_guests": "array", "warnings": "text"}'),
('course', 'Courses', 'Multi-course event timing', 'Clock', '{"name": "text", "sequence": "number", "start_time": "time", "duration": "number", "menu_items": "array", "service_style": "select"}'
);

-- Content Items Table (Main content storage)
CREATE TABLE IF NOT EXISTS public.cms_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_id UUID NOT NULL REFERENCES public.cms_content_types(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, review, approved, published, archived
  language VARCHAR(10) DEFAULT 'en',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb, -- Custom fields per type
  author_id VARCHAR(100),
  reviewer_id VARCHAR(100),
  reviewer_comments TEXT,
  published_by UUID,
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(slug, language, status)
);

-- Content Versions Table (Version history and rollback)
CREATE TABLE IF NOT EXISTS public.cms_content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255),
  content JSONB,
  metadata JSONB,
  change_summary TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Content Translations Table (Multi-language support)
CREATE TABLE IF NOT EXISTS public.cms_content_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  title VARCHAR(255),
  content JSONB,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  translated_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(content_id, language)
);

-- Content Comments/Feedback Table
CREATE TABLE IF NOT EXISTS public.cms_content_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  user_id VARCHAR(100),
  comment TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Publishing Workflow Steps
CREATE TABLE IF NOT EXISTS public.cms_publishing_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  step VARCHAR(20) NOT NULL, -- draft, in_review, approved, publishing, published, rejected
  actor_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- User Roles for CMS (Role-based access control)
CREATE TABLE IF NOT EXISTS public.cms_user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, editor, reviewer, publisher, viewer
  content_types TEXT[] DEFAULT ARRAY[]::text[], -- Specific content types this user can edit (empty = all)
  can_publish BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Content Analytics
CREATE TABLE IF NOT EXISTS public.cms_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scheduled Content Publishing
CREATE TABLE IF NOT EXISTS public.cms_scheduled_publishing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_by VARCHAR(100),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cms_content_type_id ON public.cms_content(type_id);
CREATE INDEX IF NOT EXISTS idx_cms_content_status ON public.cms_content(status);
CREATE INDEX IF NOT EXISTS idx_cms_content_language ON public.cms_content(language);
CREATE INDEX IF NOT EXISTS idx_cms_content_slug ON public.cms_content(slug);
CREATE INDEX IF NOT EXISTS idx_cms_content_published_at ON public.cms_content(published_at);
CREATE INDEX IF NOT EXISTS idx_cms_content_scheduled ON public.cms_scheduled_publishing(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_cms_versions_content_id ON public.cms_content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_cms_translations_content_id ON public.cms_content_translations(content_id);
CREATE INDEX IF NOT EXISTS idx_cms_user_roles_user_id ON public.cms_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_comments_content_id ON public.cms_content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_cms_workflow_content_id ON public.cms_publishing_workflow(content_id);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_content_id ON public.cms_analytics(content_id);

-- RLS (Row Level Security) Policies
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see published content or content they created/are reviewing
CREATE POLICY cms_content_select ON public.cms_content
  FOR SELECT USING (
    status = 'published' OR 
    author_id = current_user_id() OR 
    reviewer_id = current_user_id() OR
    EXISTS (
      SELECT 1 FROM public.cms_user_roles 
      WHERE user_id = current_user_id() AND role IN ('admin', 'editor', 'reviewer')
    )
  );

-- Policy: Only admins and editors can insert content
CREATE POLICY cms_content_insert ON public.cms_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cms_user_roles 
      WHERE user_id = current_user_id() AND role IN ('admin', 'editor')
    )
  );

-- Policy: Only content author, reviewer, or admin can update
CREATE POLICY cms_content_update ON public.cms_content
  FOR UPDATE USING (
    author_id = current_user_id() OR
    reviewer_id = current_user_id() OR
    EXISTS (
      SELECT 1 FROM public.cms_user_roles 
      WHERE user_id = current_user_id() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete
CREATE POLICY cms_content_delete ON public.cms_content
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cms_user_roles 
      WHERE user_id = current_user_id() AND role = 'admin'
    )
  );

-- Helper function: Get current user ID from auth
CREATE OR REPLACE FUNCTION current_user_id() RETURNS VARCHAR AS $$
BEGIN
  RETURN auth.uid()::varchar;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON public.cms_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_types_updated_at BEFORE UPDATE ON public.cms_content_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-create version entry on content update
CREATE OR REPLACE FUNCTION create_content_version()
RETURNS TRIGGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_number
  FROM public.cms_content_versions
  WHERE content_id = NEW.id;
  
  INSERT INTO public.cms_content_versions (content_id, version_number, title, content, metadata, change_summary, created_by)
  VALUES (NEW.id, v_number, NEW.title, NEW.content, NEW.metadata, 'Auto-saved version', NEW.author_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_version_on_update AFTER UPDATE ON public.cms_content
  FOR EACH ROW EXECUTE FUNCTION create_content_version();

-- Trigger: Auto-create analytics record for new content
CREATE OR REPLACE FUNCTION create_content_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cms_analytics (content_id, views, likes, comments_count)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_analytics_on_insert AFTER INSERT ON public.cms_content
  FOR EACH ROW EXECUTE FUNCTION create_content_analytics();
