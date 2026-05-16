-- Migration 019: RFQ (Request for Quote) Workflow
-- Multi-supplier bidding and competitive procurement

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- REQUEST FOR QUOTE (RFQ) HEADERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE SET NULL,
  rfq_number TEXT NOT NULL UNIQUE,
  rfq_type TEXT DEFAULT 'goods' CHECK (rfq_type IN ('goods', 'service', 'combined')),
  rfq_title TEXT NOT NULL,
  description TEXT,
  estimated_annual_spend NUMERIC(14,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'awarded', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_date TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  evaluation_completed_at TIMESTAMPTZ,
  award_date TIMESTAMPTZ,
  awarded_supplier_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rfq_org_idx ON rfq_headers (organization_id);
CREATE INDEX rfq_status_idx ON rfq_headers (status);
CREATE INDEX rfq_deadline_idx ON rfq_headers (response_deadline);

-- ============================================================================
-- RFQ LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_headers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_description TEXT,
  category_tier1_id UUID REFERENCES product_tier1_categories(id),
  category_tier2_id UUID REFERENCES product_tier2_categories(id),
  quantity_needed NUMERIC(14,4) NOT NULL,
  uom TEXT NOT NULL,
  annual_volume_estimate NUMERIC(14,4),
  line_number INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rfq_lines_rfq_idx ON rfq_line_items (rfq_id);
CREATE INDEX rfq_lines_product_idx ON rfq_line_items (product_id);

-- ============================================================================
-- RFQ SUPPLIER INVITATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_supplier_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_headers(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invitation_sent_date TIMESTAMPTZ,
  invitation_sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response_received_date TIMESTAMPTZ,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'declined', 'failed_to_respond')),
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX rfq_invite_rfq_idx ON rfq_supplier_invitations (rfq_id);
CREATE INDEX rfq_invite_supplier_idx ON rfq_supplier_invitations (supplier_id);
CREATE INDEX rfq_invite_status_idx ON rfq_supplier_invitations (response_status);

-- ============================================================================
-- RFQ RESPONSES (Supplier bids)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_headers(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  response_number TEXT NOT NULL UNIQUE,
  response_date TIMESTAMPTZ DEFAULT now(),
  total_bid_amount NUMERIC(14,2),
  payment_terms TEXT,
  delivery_timeline_days INT,
  lead_time_days INT,
  minimum_order_qty NUMERIC(14,4),
  volume_discount_offered BOOLEAN DEFAULT FALSE,
  special_conditions TEXT,
  contact_person TEXT,
  contact_email TEXT,
  attachment_url TEXT,
  evaluation_score NUMERIC(5,2),  -- 0-100
  evaluation_notes TEXT,
  evaluation_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluation_at TIMESTAMPTZ,
  ranking INT,  -- 1st best, 2nd, 3rd, etc.
  rank_reason TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'under_review', 'passed_initial_review', 'rejected', 'selected_for_award')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX rfq_resp_rfq_idx ON rfq_responses (rfq_id);
CREATE INDEX rfq_resp_supplier_idx ON rfq_responses (supplier_id);
CREATE INDEX rfq_resp_score_idx ON rfq_responses (evaluation_score DESC);
CREATE INDEX rfq_resp_ranking_idx ON rfq_responses (ranking);

-- ============================================================================
-- RFQ RESPONSE LINE ITEMS (Supplier's pricing per line)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_response_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_response_id UUID NOT NULL REFERENCES rfq_responses(id) ON DELETE CASCADE,
  rfq_line_id UUID NOT NULL REFERENCES rfq_line_items(id) ON DELETE CASCADE,
  unit_price NUMERIC(12,4),
  line_total NUMERIC(14,4),
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rfq_resp_lines_resp_idx ON rfq_response_line_items (rfq_response_id);

-- ============================================================================
-- RFQ EVALUATION CRITERIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_headers(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  criteria_type TEXT CHECK (criteria_type IN ('price', 'quality', 'delivery', 'service', 'compliance', 'other')),
  weight_percent NUMERIC(5,2),  -- 100% total across all criteria
  scoring_method TEXT,  -- 'numeric', 'text', 'yes_no'
  min_score_threshold NUMERIC(5,2),  -- Minimum to pass
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rfq_id, criteria_name)
);

CREATE INDEX eval_criteria_rfq_idx ON rfq_evaluation_criteria (rfq_id);

-- ============================================================================
-- RFQ EVALUATION SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_response_id UUID NOT NULL REFERENCES rfq_responses(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES rfq_evaluation_criteria(id) ON DELETE CASCADE,
  scored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  comments TEXT,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rfq_response_id, criteria_id)
);

-- ============================================================================
-- FUNCTION: Award RFQ and create contract
-- ============================================================================
CREATE OR REPLACE FUNCTION award_rfq_and_create_contract(
  p_rfq_id UUID,
  p_selected_response_id UUID,
  p_contract_start_date DATE,
  p_contract_end_date DATE
)
RETURNS UUID AS $$
DECLARE
  l_supplier_id UUID;
  l_contract_id UUID;
  l_contract_number TEXT;
BEGIN
  -- Get supplier from response
  SELECT supplier_id INTO l_supplier_id
  FROM rfq_responses
  WHERE id = p_selected_response_id;
  
  -- Generate contract number
  l_contract_number := 'CNT-' || to_char(now(), 'YYYYMM') || '-' || 
    (SELECT COUNT(*) + 1 FROM supplier_contracts 
     WHERE organization_id = (SELECT organization_id FROM rfq_headers WHERE id = p_rfq_id));
  
  -- Create contract
  INSERT INTO supplier_contracts (
    organization_id,
    supplier_id,
    contract_number,
    contract_type,
    start_date,
    end_date,
    status,
    created_by
  )
  SELECT
    rfq.organization_id,
    l_supplier_id,
    l_contract_number,
    'supply',
    p_contract_start_date,
    p_contract_end_date,
    'draft',
    rfq.created_by
  FROM rfq_headers rfq
  WHERE rfq.id = p_rfq_id
  RETURNING id INTO l_contract_id;
  
  -- Update RFQ
  UPDATE rfq_headers
  SET status = 'awarded',
      awarded_supplier_id = l_supplier_id,
      award_date = now(),
      updated_at = now()
  WHERE id = p_rfq_id;
  
  -- Mark response as selected
  UPDATE rfq_responses
  SET status = 'selected_for_award'
  WHERE id = p_selected_response_id;
  
  RETURN l_contract_id;
END
$$ LANGUAGE plpgsql;
