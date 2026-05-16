-- OCR Processing Results Table
CREATE TABLE IF NOT EXISTS invoice_ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  image_hash VARCHAR(64) NOT NULL,
  raw_text TEXT,
  word_count INT DEFAULT 0,
  confidence NUMERIC(3,2) DEFAULT 0.0,
  processing_time_ms INT DEFAULT 0,
  ocr_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, image_hash)
);

-- Field-Level Extractions with Confidence
CREATE TABLE IF NOT EXISTS field_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_result_id UUID NOT NULL REFERENCES invoice_ocr_results(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  field_name VARCHAR(100) NOT NULL,
  raw_value TEXT,
  extracted_value TEXT,
  confidence NUMERIC(3,2),
  validation_status VARCHAR(20) CHECK (validation_status IN ('valid', 'suspicious', 'invalid')),
  validation_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (ocr_result_id),
  INDEX (invoice_id),
  INDEX (field_name)
);

-- Confidence Scores per Field Type
CREATE TABLE IF NOT EXISTS extraction_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_type VARCHAR(100) NOT NULL,
  average_confidence NUMERIC(3,2),
  sample_size INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, field_type)
);

-- OCR Errors and Failures
CREATE TABLE IF NOT EXISTS ocr_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  error_type VARCHAR(50),
  error_message TEXT,
  image_hash VARCHAR(64),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (organization_id),
  INDEX (created_at),
  INDEX (resolved_at)
);

-- Invoice Processing Queue Status
CREATE TABLE IF NOT EXISTS invoice_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  job_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  INDEX (organization_id),
  INDEX (invoice_id),
  INDEX (status),
  INDEX (created_at)
);

-- OCR Metrics and Performance Tracking
CREATE TABLE IF NOT EXISTS ocr_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_invoices_processed INT DEFAULT 0,
  successful_extractions INT DEFAULT 0,
  failed_extractions INT DEFAULT 0,
  average_confidence NUMERIC(3,2),
  average_processing_time_ms INT,
  avg_field_accuracy NUMERIC(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, metric_date),
  INDEX (organization_id, metric_date)
);

-- Line Item Extractions
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_result_id UUID NOT NULL REFERENCES invoice_ocr_results(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  line_number INT,
  description TEXT,
  quantity NUMERIC(12,4),
  unit_price NUMERIC(12,2),
  amount NUMERIC(14,2),
  confidence NUMERIC(3,2),
  validation_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (ocr_result_id),
  INDEX (invoice_id),
  INDEX (line_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ocr_results_org_created ON invoice_ocr_results(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_results_invoice ON invoice_ocr_results(invoice_id);
CREATE INDEX IF NOT EXISTS idx_field_extractions_status ON field_extractions(validation_status);
CREATE INDEX IF NOT EXISTS idx_ocr_errors_org_created ON ocr_errors(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_queue_org_status ON invoice_processing_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);

-- Enable row level security
ALTER TABLE invoice_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for OCR Results
CREATE POLICY "Users can view OCR results for their org" ON invoice_ocr_results
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE id = auth.jwt() ->> 'org_id'
    )
  );

CREATE POLICY "Users can insert OCR results for their org" ON invoice_ocr_results
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE id = auth.jwt() ->> 'org_id'
    )
  );

-- Similar policies for other tables (simplified for brevity)
CREATE POLICY "Users can view field extractions for their org" ON field_extractions
  FOR SELECT USING (
    ocr_result_id IN (
      SELECT id FROM invoice_ocr_results 
      WHERE organization_id = auth.jwt() ->> 'org_id'
    )
  );
