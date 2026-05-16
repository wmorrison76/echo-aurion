-- Collaboration and Approval Workflow Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Comments table for document collaboration
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'purchase_order', 'receiving', 'exception')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  mentions TEXT[],
  attachments TEXT[],
  likes INT DEFAULT 0,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_document_idx
  ON comments (document_id, document_type);
CREATE INDEX IF NOT EXISTS comments_user_idx
  ON comments (user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx
  ON comments (created_at DESC);

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'purchase_order', 'receiving')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  approvers JSONB DEFAULT '[]',
  required_approvals INT DEFAULT 1,
  current_approvals INT DEFAULT 0,
  rejection_reason TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_requests_org_status_idx
  ON approval_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS approval_requests_document_idx
  ON approval_requests (document_id);
CREATE INDEX IF NOT EXISTS approval_requests_created_at_idx
  ON approval_requests (created_at DESC);

-- Approval decisions table
CREATE TABLE IF NOT EXISTS approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_name TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_decisions_request_idx
  ON approval_decisions (approval_request_id);
CREATE INDEX IF NOT EXISTS approval_decisions_approver_idx
  ON approval_decisions (approver_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'approval_request', 'comment_reply', 'approval_completed', 'exception', 'system')),
  related_document UUID,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON notifications (created_at DESC);

-- Approval workflows (templates)
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'purchase_order', 'receiving')),
  approvers JSONB DEFAULT '[]',
  required_approvals INT DEFAULT 1,
  auto_escalate BOOLEAN DEFAULT FALSE,
  escalation_hours INT,
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_workflows_org_idx
  ON approval_workflows (organization_id);
CREATE INDEX IF NOT EXISTS approval_workflows_document_type_idx
  ON approval_workflows (document_type);

-- Approval metrics/stats
CREATE TABLE IF NOT EXISTS approval_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_approved INT DEFAULT 0,
  total_rejected INT DEFAULT 0,
  average_approval_time_minutes NUMERIC(10,2),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_metrics_org_idx
  ON approval_metrics (organization_id);

-- RLS Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

-- User can access comments for their organization
CREATE POLICY comments_user_access ON comments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access approval requests for their organization
CREATE POLICY approval_requests_user_access ON approval_requests
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access their own notifications
CREATE POLICY notifications_user_access ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- User can access workflows for their organization
CREATE POLICY workflows_user_access ON approval_workflows
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_requests_updated_at_idx
  ON approval_requests (updated_at DESC);
