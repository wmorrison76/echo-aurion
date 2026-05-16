-- Image Vault System
-- Centralized storage for invoices, receipts, and supporting documents

CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt', 'credit_memo', 'packing_slip', 'proof_of_delivery', 'other')),
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  file_hash TEXT UNIQUE,
  mime_type TEXT,
  storage_location TEXT CHECK (storage_location IN ('s3', 'local', 'azure')),
  original_filename TEXT,
  source_reference_type TEXT CHECK (source_reference_type IN ('invoice', 'purchase_order', 'shipment', 'vendor')),
  source_reference_id UUID,
  is_primary BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_text TEXT,
  extracted_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_org_outlet_idx ON vault_documents(organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS documents_type_idx ON vault_documents(document_type);
CREATE INDEX IF NOT EXISTS documents_reference_idx ON vault_documents(source_reference_type, source_reference_id);
CREATE INDEX IF NOT EXISTS documents_created_idx ON vault_documents(created_at DESC);

CREATE TABLE IF NOT EXISTS vault_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_category TEXT,
  color_code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, tag_name)
);

CREATE INDEX IF NOT EXISTS tags_org_idx ON vault_tags(organization_id);

CREATE TABLE IF NOT EXISTS vault_document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, tag_id)
);

CREATE INDEX IF NOT EXISTS doc_tags_document_idx ON vault_document_tags(document_id);
CREATE INDEX IF NOT EXISTS doc_tags_tag_idx ON vault_document_tags(tag_id);

CREATE TABLE IF NOT EXISTS vault_gl_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id) ON DELETE CASCADE,
  gl_code TEXT,
  allocation_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, gl_code_id)
);

CREATE INDEX IF NOT EXISTS associations_document_idx ON vault_gl_associations(document_id);
CREATE INDEX IF NOT EXISTS associations_gl_code_idx ON vault_gl_associations(gl_code_id);

CREATE TABLE IF NOT EXISTS vault_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  to_document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('invoice_receipt', 'invoice_po', 'payment_invoice', 'credit_memo_invoice', 'related_document')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_document_id, to_document_id, link_type)
);

CREATE INDEX IF NOT EXISTS links_from_idx ON vault_document_links(from_document_id);
CREATE INDEX IF NOT EXISTS links_to_idx ON vault_document_links(to_document_id);

CREATE TABLE IF NOT EXISTS vault_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  search_tokens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS search_index_text_idx ON vault_search_index USING GIN(search_tokens);
CREATE INDEX IF NOT EXISTS search_index_doc_idx ON vault_search_index(document_id);

CREATE TABLE IF NOT EXISTS vault_document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'export')),
  ip_address TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_log_document_idx ON vault_document_access_log(document_id);
CREATE INDEX IF NOT EXISTS access_log_user_idx ON vault_document_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS access_log_time_idx ON vault_document_access_log(accessed_at DESC);

CREATE TABLE IF NOT EXISTS vault_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  retention_days INT NOT NULL,
  auto_delete BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, document_type)
);

CREATE INDEX IF NOT EXISTS policies_org_idx ON vault_retention_policies(organization_id);

-- RLS POLICIES

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_gl_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_org_access ON vault_documents
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = vault_documents.outlet_id
    )
  );

CREATE POLICY tags_org_access ON vault_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY doc_tags_access ON vault_document_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents vd
      WHERE vd.id = vault_document_tags.document_id
      AND auth.uid() IN (
        SELECT om.user_id FROM outlet_memberships om
        WHERE om.outlet_id = vd.outlet_id
      )
    )
  );

CREATE POLICY associations_access ON vault_gl_associations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents vd
      WHERE vd.id = vault_gl_associations.document_id
      AND auth.uid() IN (
        SELECT om.user_id FROM outlet_memberships om
        WHERE om.outlet_id = vd.outlet_id
      )
    )
  );

CREATE POLICY links_access ON vault_document_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents vd
      WHERE vd.id = vault_document_links.from_document_id
      AND auth.uid() IN (
        SELECT om.user_id FROM outlet_memberships om
        WHERE om.outlet_id = vd.outlet_id
      )
    )
  );

CREATE POLICY search_index_access ON vault_search_index
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents vd
      WHERE vd.id = vault_search_index.document_id
      AND auth.uid() IN (
        SELECT om.user_id FROM outlet_memberships om
        WHERE om.outlet_id = vd.outlet_id
      )
    )
  );

CREATE POLICY access_log_access ON vault_document_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents vd
      WHERE vd.id = vault_document_access_log.document_id
      AND auth.uid() IN (
        SELECT om.user_id FROM outlet_memberships om
        WHERE om.outlet_id = vd.outlet_id
      )
    )
  );

CREATE POLICY policies_org_access ON vault_retention_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- VIEWS FOR VAULT INSIGHTS

CREATE OR REPLACE VIEW vault_document_summary AS
SELECT
  organization_id,
  outlet_id,
  document_type,
  COUNT(*) as document_count,
  SUM(file_size) as total_size,
  MAX(created_at) as latest_document
FROM vault_documents
GROUP BY organization_id, outlet_id, document_type;

CREATE OR REPLACE VIEW vault_gl_coverage AS
SELECT
  vd.organization_id,
  vd.outlet_id,
  COUNT(DISTINCT vd.id) as documents_with_gl,
  COUNT(DISTINCT vga.gl_code_id) as unique_gl_codes
FROM vault_documents vd
LEFT JOIN vault_gl_associations vga ON vd.id = vga.document_id
GROUP BY vd.organization_id, vd.outlet_id;

-- COMPOSITE INDEXES FOR SEARCH

CREATE INDEX IF NOT EXISTS documents_composite_idx ON vault_documents(
  organization_id, outlet_id, document_type, created_at DESC
);

CREATE INDEX IF NOT EXISTS search_composite_idx ON vault_search_index(
  document_id, search_tokens
);
