/**
 * ABAC (Attribute-Based Access Control) Policies Schema
 * Enables fine-grained, context-aware access control with declarative policies
 */

-- =====================================================
-- ABAC POLICIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS abac_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Policy definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100) NOT NULL, -- e.g., "recipe", "beo", "purchase_order"
  action VARCHAR(50) NOT NULL, -- e.g., "read", "write", "delete", "approve"
  
  -- Policy DSL and compiled form
  dsl TEXT NOT NULL, -- Policy DSL string
  compiled JSONB, -- Compiled policy structure for fast evaluation
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_resource_action UNIQUE (org_id, resource_type, action, name)
);

CREATE INDEX idx_abac_policies_org ON abac_policies(org_id);
CREATE INDEX idx_abac_policies_resource_action ON abac_policies(resource_type, action);
CREATE INDEX idx_abac_policies_active ON abac_policies(is_active) WHERE is_active = TRUE;

-- =====================================================
-- ABAC POLICY EVALUATIONS TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS abac_policy_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Policy reference
  policy_id UUID NOT NULL REFERENCES abac_policies(id) ON DELETE CASCADE,
  rule_id VARCHAR(255),
  
  -- Evaluation context
  user_id UUID,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  action VARCHAR(50) NOT NULL,
  
  -- Result
  allowed BOOLEAN NOT NULL,
  context JSONB, -- Full evaluation context for debugging
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_abac_evaluations_policy ON abac_policy_evaluations(policy_id);
CREATE INDEX idx_abac_evaluations_org ON abac_policy_evaluations(org_id);
CREATE INDEX idx_abac_evaluations_user ON abac_policy_evaluations(user_id);
CREATE INDEX idx_abac_evaluations_resource ON abac_policy_evaluations(resource_type, resource_id);
CREATE INDEX idx_abac_evaluations_evaluated ON abac_policy_evaluations(evaluated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE abac_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE abac_policy_evaluations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY abac_policies_tenant_isolation ON abac_policies
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY abac_evaluations_tenant_isolation ON abac_policy_evaluations
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- =====================================================
-- SAMPLE POLICIES (Examples)
-- =====================================================

-- Example 1: Admin full access
INSERT INTO abac_policies (org_id, name, description, resource_type, action, dsl, compiled)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual org_id
  'admin_full_access',
  'Admin users have full access to all resources',
  'recipe',
  'write',
  'admin_access: ALLOW IF user.role eq "admin"',
  jsonb_build_object(
    'version', '1.0',
    'rules', jsonb_build_array(
      jsonb_build_object(
        'id', 'rule-admin_access',
        'name', 'admin_access',
        'effect', 'ALLOW',
        'conditions', jsonb_build_array(
          jsonb_build_object(
            'attribute', 'user.role',
            'operator', 'eq',
            'value', 'admin'
          )
        ),
        'logicalOperator', 'AND',
        'priority', 50
      )
    )
  )
) ON CONFLICT DO NOTHING;

-- Example 2: Outlet-based access
INSERT INTO abac_policies (org_id, name, description, resource_type, action, dsl, compiled)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual org_id
  'outlet_access',
  'Users can only access resources in their assigned outlets',
  'recipe',
  'read',
  'outlet_access: ALLOW IF user.outlet_ids contains resource.outlet_id',
  jsonb_build_object(
    'version', '1.0',
    'rules', jsonb_build_array(
      jsonb_build_object(
        'id', 'rule-outlet_access',
        'name', 'outlet_access',
        'effect', 'ALLOW',
        'conditions', jsonb_build_array(
          jsonb_build_object(
            'attribute', 'user.outlet_ids',
            'operator', 'contains',
            'value', 'resource.outlet_id'
          )
        ),
        'logicalOperator', 'AND',
        'priority', 50
      )
    )
  )
) ON CONFLICT DO NOTHING;

-- Example 3: Time-based restriction
INSERT INTO abac_policies (org_id, name, description, resource_type, action, dsl, compiled)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual org_id
  'business_hours_only',
  'Prevent access outside business hours (8 AM - 10 PM)',
  'recipe',
  'write',
  E'business_hours: ALLOW IF time.hour gte 8 AND time.hour lt 22\nbusiness_hours_deny: DENY IF time.hour lt 8 OR time.hour gte 22',
  jsonb_build_object(
    'version', '1.0',
    'rules', jsonb_build_array(
      jsonb_build_object(
        'id', 'rule-business_hours',
        'name', 'business_hours',
        'effect', 'ALLOW',
        'conditions', jsonb_build_array(
          jsonb_build_object('attribute', 'time.hour', 'operator', 'gte', 'value', 8),
          jsonb_build_object('attribute', 'time.hour', 'operator', 'lt', 'value', 22)
        ),
        'logicalOperator', 'AND',
        'priority', 50
      ),
      jsonb_build_object(
        'id', 'rule-business_hours_deny',
        'name', 'business_hours_deny',
        'effect', 'DENY',
        'conditions', jsonb_build_array(
          jsonb_build_object('attribute', 'time.hour', 'operator', 'lt', 'value', 8)
        ),
        'logicalOperator', 'OR',
        'priority', 100
      )
    )
  )
) ON CONFLICT DO NOTHING;
