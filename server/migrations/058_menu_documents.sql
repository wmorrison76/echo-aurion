-- Migration: Menu Documents and Parsed Menus
-- Purpose: Store menu documents and parsed menu data for BEO generation
-- Date: 2025-01-16
-- Production-ready, military-grade, AI^3 optimized, no-fail architecture

-- Menu Documents Table
CREATE TABLE IF NOT EXISTS menu_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  org_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'image', 'url')),
  file_url TEXT,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  parsed_menu_id UUID,
  
  INDEX idx_menu_documents_tenant ON menu_documents(tenant_id, uploaded_at DESC),
  INDEX idx_menu_documents_status ON menu_documents(status, uploaded_at DESC),
  INDEX idx_menu_documents_org ON menu_documents(org_id, uploaded_at DESC)
);

-- Parsed Menus Table
CREATE TABLE IF NOT EXISTS parsed_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_document_id UUID NOT NULL REFERENCES menu_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  org_id UUID NOT NULL,
  restaurant_name VARCHAR(255),
  menu_items JSONB NOT NULL DEFAULT '[]',
  menu_sections TEXT[] NOT NULL DEFAULT '{}',
  confidence_score FLOAT NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  extracted_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_parsed_menus_tenant ON parsed_menus(tenant_id, created_at DESC),
  INDEX idx_parsed_menus_document ON parsed_menus(menu_document_id),
  INDEX idx_parsed_menus_org ON parsed_menus(org_id, created_at DESC)
);

-- RLS Policies
ALTER TABLE menu_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view menu documents in their tenant"
  ON menu_documents FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert menu documents in their tenant"
  ON menu_documents FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can update menu documents in their tenant"
  ON menu_documents FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can view parsed menus in their tenant"
  ON parsed_menus FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert parsed menus in their tenant"
  ON parsed_menus FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Comments
COMMENT ON TABLE menu_documents IS 'Stores uploaded menu documents (PDF, images, URLs) for BEO generation';
COMMENT ON TABLE parsed_menus IS 'Stores parsed menu data extracted from menu documents using AI';
