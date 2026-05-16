/**
 * Row Level Security (RLS) Policies for Calendar System
 * Enterprise-grade access control for multi-tenant calendar operations
 * 
 * Policies enforce:
 * - Organization-level isolation
 * - Outlet-level access control
 * - Sharing-based permissions (like sticky notes)
 * - Audit logging for compliance
 * 
 * Setup:
 * 1. Run these SQL statements against your Neon database
 * 2. Enable RLS on all calendar tables
 * 3. Verify policies with: SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableisrls = TRUE;
 */

-- =====================================================
-- PREREQUISITE: Enable RLS on tables
-- =====================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CALENDAR_EVENTS Policies
-- =====================================================

/**
 * Users can view events in their organization and outlets they have access to
 */
CREATE POLICY "users_view_own_org_events" ON calendar_events
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    AND (
      -- Can view if in same outlet
      outlet_id IN (
        SELECT id FROM calendar_outlets
        WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      )
      OR
      -- Can view if event is shared with them
      id IN (
        SELECT event_id FROM calendar_event_sharing
        WHERE shared_with_user_id = auth.uid()
        AND share_type IN ('view', 'edit')
      )
    )
  );

/**
 * Users can create events in outlets they manage
 */
CREATE POLICY "users_create_own_org_events" ON calendar_events
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    AND outlet_id IN (
      SELECT id FROM calendar_outlets
      WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
      AND is_active = TRUE
    )
    AND created_by = auth.uid()::text
  );

/**
 * Users can update their own events or events shared with edit permission
 */
CREATE POLICY "users_update_own_org_events" ON calendar_events
  FOR UPDATE
  USING (
    (created_by = auth.uid()::text AND org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
    OR
    (id IN (
      SELECT event_id FROM calendar_event_sharing
      WHERE shared_with_user_id = auth.uid()
      AND share_type = 'edit'
    ))
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

/**
 * Users can delete events they created
 */
CREATE POLICY "users_delete_own_events" ON calendar_events
  FOR DELETE
  USING (
    created_by = auth.uid()::text
    AND org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- CALENDAR_OUTLETS Policies
-- =====================================================

/**
 * Users can view outlets in their organization
 */
CREATE POLICY "users_view_own_org_outlets" ON calendar_outlets
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

/**
 * Only organization admins can manage outlets
 */
CREATE POLICY "admins_manage_outlets" ON calendar_outlets
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- CALENDAR_CONFLICTS Policies
-- =====================================================

/**
 * Users can view conflicts for events in their organization
 */
CREATE POLICY "users_view_own_org_conflicts" ON calendar_conflicts
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

/**
 * Conflict records are auto-created by triggers; users cannot directly insert
 */
CREATE POLICY "prevent_direct_conflict_insert" ON calendar_conflicts
  FOR INSERT
  WITH CHECK (FALSE);

/**
 * System can update conflicts; users cannot
 */
CREATE POLICY "prevent_user_conflict_updates" ON calendar_conflicts
  FOR UPDATE
  USING (FALSE);

-- =====================================================
-- CALENDAR_EVENT_SHARING Policies
-- =====================================================

/**
 * Users can view sharing records for events they created or events shared with them
 */
CREATE POLICY "users_view_sharing_records" ON calendar_event_sharing
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM calendar_events
      WHERE created_by = auth.uid()::text
    )
    OR
    shared_with_user_id = auth.uid()
  );

/**
 * Event creators can share their events
 */
CREATE POLICY "event_creators_share" ON calendar_event_sharing
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM calendar_events
      WHERE created_by = auth.uid()::text
    )
  );

/**
 * Event creators can revoke sharing
 */
CREATE POLICY "event_creators_revoke_sharing" ON calendar_event_sharing
  FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM calendar_events
      WHERE created_by = auth.uid()::text
    )
  );

-- =====================================================
-- CALENDAR_AUDIT_LOGS Policies
-- =====================================================

/**
 * Users can view audit logs for their organization
 */
CREATE POLICY "users_view_own_org_audit_logs" ON calendar_audit_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

/**
 * Prevent direct audit log modifications (append-only)
 */
CREATE POLICY "audit_logs_append_only" ON calendar_audit_logs
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    AND user_id = auth.uid()::text
  );

CREATE POLICY "prevent_audit_log_updates" ON calendar_audit_logs
  FOR UPDATE
  USING (FALSE);

CREATE POLICY "prevent_audit_log_deletes" ON calendar_audit_logs
  FOR DELETE
  USING (FALSE);

-- =====================================================
-- PERFORMANCE INDEXES for RLS Queries
-- =====================================================

CREATE INDEX idx_calendar_events_org_id ON calendar_events(org_id);
CREATE INDEX idx_calendar_events_outlet_id ON calendar_events(outlet_id);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time DESC);
CREATE INDEX idx_calendar_events_org_start_time ON calendar_events(org_id, start_time DESC);

CREATE INDEX idx_calendar_outlets_org_id ON calendar_outlets(org_id);
CREATE INDEX idx_calendar_outlets_active ON calendar_outlets(org_id, is_active);

CREATE INDEX idx_calendar_conflicts_org_id ON calendar_conflicts(org_id);
CREATE INDEX idx_calendar_conflicts_event_ids ON calendar_conflicts(event_id_1, event_id_2);
CREATE INDEX idx_calendar_conflicts_detected_at ON calendar_conflicts(detected_at DESC);

CREATE INDEX idx_calendar_event_sharing_event_id ON calendar_event_sharing(event_id);
CREATE INDEX idx_calendar_event_sharing_user_id ON calendar_event_sharing(shared_with_user_id);
CREATE INDEX idx_calendar_event_sharing_type ON calendar_event_sharing(share_type);

CREATE INDEX idx_calendar_audit_logs_org_id ON calendar_audit_logs(org_id);
CREATE INDEX idx_calendar_audit_logs_user_id ON calendar_audit_logs(user_id);
CREATE INDEX idx_calendar_audit_logs_action ON calendar_audit_logs(action);
CREATE INDEX idx_calendar_audit_logs_timestamp ON calendar_audit_logs(created_at DESC);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename LIKE 'calendar_%';

-- Check active policies:
-- SELECT schemaname, tablename, policyname, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename LIKE 'calendar_%';

-- Test policy effectiveness:
-- SELECT * FROM calendar_events 
-- WHERE org_id = current_setting('app.org_id')::uuid
-- LIMIT 5;
