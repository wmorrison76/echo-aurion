/**
 * LUCCCA Mobile Database Schema
 * SQLite tables for offline event storage, sync queue, and metadata
 */

export const DATABASE_SCHEMA = `
-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TEXT NOT NULL
);

-- Outlets Table
CREATE TABLE IF NOT EXISTS outlets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Events Table (Main calendar data)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  outlet_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  guest_count INTEGER,
  status TEXT DEFAULT 'confirmed',
  guest_list TEXT,
  notes TEXT,
  created_by TEXT,
  external_id TEXT,
  external_provider TEXT,
  is_all_day BOOLEAN DEFAULT 0,
  is_recurring BOOLEAN DEFAULT 0,
  recurrence_rule TEXT,
  reminder_minutes INTEGER,
  conflict_detected BOOLEAN DEFAULT 0,
  is_synced BOOLEAN DEFAULT 0,
  last_synced TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL
);

-- Create indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_outlet_id ON events(outlet_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_is_synced ON events(is_synced);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id);
CREATE INDEX IF NOT EXISTS idx_events_conflict ON events(conflict_detected);

-- Sync Queue (Offline changes pending sync)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempted INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_event_id ON sync_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_attempted ON sync_queue(attempted);

-- Change Tracking (for incremental sync)
CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  field_name TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_changes_event_id ON changes(event_id);
CREATE INDEX IF NOT EXISTS idx_changes_synced_at ON changes(synced_at);

-- Integrations (OAuth tokens, sync status)
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  is_active BOOLEAN DEFAULT 1,
  is_syncing BOOLEAN DEFAULT 0,
  last_sync_at TEXT,
  last_error TEXT,
  sync_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- Sync Logs (History of sync operations)
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  integration_id TEXT,
  sync_type TEXT,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  status TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- Cache Table (For offline metadata)
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

-- User Permissions (Cached from server)
CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permissions_org_id ON user_permissions(org_id);
CREATE INDEX IF NOT EXISTS idx_permissions_permission ON user_permissions(permission);

-- Conflict History
CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  conflict_with_event_id TEXT,
  conflict_type TEXT,
  resolution TEXT,
  is_resolved BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conflicts_event_id ON conflicts(event_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_is_resolved ON conflicts(is_resolved);

-- Analytics Events (Tracked app events)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  properties TEXT,
  timestamp TEXT NOT NULL,
  synced BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id ON analytics_events(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_synced ON analytics_events(synced);

-- Analytics Data (Cached snapshots)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  outlet_id TEXT,
  snapshot_date TEXT NOT NULL,
  revenue REAL,
  event_count INTEGER,
  guest_count INTEGER,
  capacity_percentage REAL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_org_id ON analytics_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_date ON analytics_snapshots(snapshot_date);
`;

/**
 * Migration scripts for schema updates
 */
export const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: DATABASE_SCHEMA,
  },
];

/**
 * Type definitions for database records
 */
export interface Event {
  id: string;
  org_id: string;
  outlet_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  guest_count?: number;
  status: "confirmed" | "tentative" | "cancelled";
  guest_list?: string;
  notes?: string;
  created_by?: string;
  external_id?: string;
  external_provider?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_rule?: string;
  reminder_minutes?: number;
  conflict_detected: boolean;
  is_synced: boolean;
  last_synced?: string;
  created_at: string;
  updated_at: string;
  synced_at?: string;
}

export interface SyncQueueItem {
  id: string;
  event_id: string;
  action: "create" | "update" | "delete";
  payload: Record<string, any>;
  attempted: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Change {
  id: string;
  event_id: string;
  change_type: "created" | "updated" | "deleted";
  old_value?: string;
  new_value?: string;
  field_name?: string;
  created_at: string;
  synced_at?: string;
}

export interface Integration {
  id: string;
  org_id: string;
  provider: "google" | "outlook" | "slack";
  account_name?: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  is_syncing: boolean;
  last_sync_at?: string;
  last_error?: string;
  sync_count: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  integration_id?: string;
  sync_type: "full" | "incremental";
  events_created: number;
  events_updated: number;
  events_deleted: number;
  conflicts_detected: number;
  status: "success" | "partial" | "failed";
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface Conflict {
  id: string;
  event_id: string;
  conflict_with_event_id?: string;
  conflict_type: string;
  resolution: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface AnalyticsEvent {
  id: string;
  org_id: string;
  event_name: string;
  event_type: string;
  properties?: string;
  timestamp: string;
  synced: boolean;
  created_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  org_id: string;
  outlet_id?: string;
  snapshot_date: string;
  revenue?: number;
  event_count: number;
  guest_count: number;
  capacity_percentage: number;
  created_at: string;
}
