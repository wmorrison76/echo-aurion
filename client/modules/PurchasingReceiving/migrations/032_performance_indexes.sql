/**
 * Migration 032: Performance Optimization Indexes
 * B.1: Fixes N+1 query performance issues with strategic indexes
 * 
 * These indexes target the most frequently queried combinations
 * and should significantly improve query performance.
 */

-- Accounting/Payments indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_org_status 
  ON invoice_payments(organization_id, status) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_invoice_payments_vendor 
  ON invoice_payments(vendor_id, organization_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_payment_terms_org 
  ON vendor_payment_terms(organization_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_org 
  ON payment_schedules(organization_id, status);

-- GL Account indexes
CREATE INDEX IF NOT EXISTS idx_gl_accounts_org_type 
  ON gl_accounts(organization_id, account_type);

CREATE INDEX IF NOT EXISTS idx_gl_entries_account 
  ON gl_entries(account_id, created_at DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_events_outlet 
  ON inventory_events(outlet_id, item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_events_item 
  ON inventory_events(item_id, outlet_id, created_at DESC);

-- Recipe/Product indexes
CREATE INDEX IF NOT EXISTS idx_recipes_org_status 
  ON recipes(organization_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe 
  ON recipe_components(recipe_id, product_id);

-- IoT Device indexes
CREATE INDEX IF NOT EXISTS idx_iot_devices_org_status 
  ON iot_devices(organization_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_iot_devices_outlet 
  ON iot_devices(outlet_id, device_type);

-- Sensor readings indexes (heavy queries - prioritize)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time 
  ON sensor_readings(device_id, read_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_sensor_readings_org_device 
  ON sensor_readings(organization_id, device_id, read_at DESC);

-- Sensor readings aggregates
CREATE INDEX IF NOT EXISTS idx_sensor_readings_daily_device 
  ON sensor_readings_daily(device_id, day_start DESC);

-- Waste logs indexes
CREATE INDEX IF NOT EXISTS idx_waste_logs_org_date 
  ON waste_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waste_logs_outlet 
  ON waste_logs(outlet_id, waste_category, created_at DESC);

-- RFID Tag indexes
CREATE INDEX IF NOT EXISTS idx_rfid_tags_location 
  ON rfid_tags(current_location, organization_id);

CREATE INDEX IF NOT EXISTS idx_rfid_tags_outlet 
  ON rfid_tags(outlet_id, status);

-- Purchase Order indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org 
  ON purchase_orders(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor 
  ON purchase_orders(vendor_id, created_at DESC);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org 
  ON invoices(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor 
  ON invoices(vendor_id, due_date);

-- Alert and automation indexes
CREATE INDEX IF NOT EXISTS idx_iot_alerts_device 
  ON iot_alerts(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iot_alerts_status 
  ON iot_alerts(organization_id, status);

-- Operational audit indexes
CREATE INDEX IF NOT EXISTS idx_organization_audit_org 
  ON organization_audit_log(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_audit_action 
  ON organization_audit_log(action, created_at DESC);

-- ANALYZE indexes for query planner optimization
ANALYZE invoice_payments;
ANALYZE sensor_readings;
ANALYZE waste_logs;
ANALYZE recipes;
ANALYZE iot_devices;
ANALYZE rfid_tags;

-- Create materialized view for common aggregations to avoid repeated calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS payment_summary_view AS
  SELECT 
    organization_id,
    outlet_id,
    status,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount,
    MAX(updated_at) as last_update
  FROM invoice_payments
  WHERE active = true
  GROUP BY organization_id, outlet_id, status;

-- Index on materialized view for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_summary_org 
  ON payment_summary_view(organization_id, status);

-- Create summary for inventory health to avoid N+1 on stock queries
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_summary_view AS
  SELECT 
    outlet_id,
    item_id,
    SUM(quantity) as quantity_on_hand,
    MAX(updated_at) as last_update
  FROM inventory_events
  WHERE event_type = 'current_on_hand' AND active = true
  GROUP BY outlet_id, item_id;

CREATE INDEX IF NOT EXISTS idx_inventory_summary_outlet 
  ON inventory_summary_view(outlet_id, item_id);

-- Partitioning suggestion for high-volume tables (PostgreSQL 11+)
-- Uncomment if needed for very large deployments:
/*
ALTER TABLE sensor_readings
  PARTITION BY RANGE (EXTRACT(YEAR FROM read_at), EXTRACT(MONTH FROM read_at));
*/
