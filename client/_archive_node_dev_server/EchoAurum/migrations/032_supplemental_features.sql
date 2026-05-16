-- ============================================================================
-- MIGRATION: Supplemental Features - Inventory, Scheduling, Bank Feeds, Revenue
-- ============================================================================

-- ============================================================================
-- INVENTORY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  snapshot_id TEXT,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2),
  unit_cost DECIMAL(12,4),
  total_value DECIMAL(14,2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_inventory_entity (entity_id),
  INDEX idx_inventory_snapshot (snapshot_id),
  UNIQUE(entity_id, sku, snapshot_id)
);

CREATE TABLE IF NOT EXISTS inventory_variances (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  period_date DATE NOT NULL,
  actual_cogs DECIMAL(14,2),
  theoretical_cogs DECIMAL(14,2),
  variance_amount DECIMAL(14,2),
  variance_percentage DECIMAL(6,2),
  status VARCHAR(50) DEFAULT 'within_tolerance', -- within_tolerance, alert, critical
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_variance_entity (entity_id),
  INDEX idx_variance_period (period_date),
  INDEX idx_variance_status (status)
);

-- ============================================================================
-- SCHEDULING / LABOR TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_shifts (
  id TEXT PRIMARY KEY DEFAULT CONCAT('shift_', UUID()),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  employee_id VARCHAR(50),
  employee_name VARCHAR(255),
  shift_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hourly_rate DECIMAL(8,2),
  scheduled_hours DECIMAL(5,2),
  estimated_labor DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_shifts_entity (entity_id),
  INDEX idx_shifts_employee (employee_id),
  INDEX idx_shifts_date (shift_date)
);

CREATE TABLE IF NOT EXISTS labor_variances (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  period_date DATE NOT NULL,
  scheduled_labor DECIMAL(14,2),
  actual_labor DECIMAL(14,2),
  variance_amount DECIMAL(14,2),
  variance_percentage DECIMAL(6,2),
  forecasted_labor DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'within_tolerance',
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_labor_entity (entity_id),
  INDEX idx_labor_period (period_date),
  INDEX idx_labor_status (status)
);

-- ============================================================================
-- BANK FEED & RECONCILIATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_feed_transactions (
  id TEXT PRIMARY KEY DEFAULT CONCAT('bank_', UUID()),
  bank_transaction_id VARCHAR(100),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  gl_entry_id TEXT,
  transaction_date DATE,
  amount DECIMAL(14,2),
  description TEXT,
  bank_account VARCHAR(50),
  transaction_type VARCHAR(20), -- debit, credit
  reconciliation_status VARCHAR(50), -- pending, reconciled, duplicate, auto_posted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_bank_entity (entity_id),
  INDEX idx_bank_transaction (bank_transaction_id),
  INDEX idx_bank_status (reconciliation_status),
  UNIQUE(bank_transaction_id, entity_id)
);

CREATE TABLE IF NOT EXISTS bank_feed_duplicates (
  id TEXT PRIMARY KEY DEFAULT CONCAT('dup_', UUID()),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  bank_transaction_id_1 VARCHAR(100),
  bank_transaction_id_2 VARCHAR(100),
  duplicate_score DECIMAL(3,2), -- 0-1 confidence
  resolution_status VARCHAR(50), -- pending, merged, excluded
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_duplicate_entity (entity_id),
  INDEX idx_duplicate_status (resolution_status)
);

-- ============================================================================
-- REVENUE METRICS & KPI TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_gl_mappings (
  id TEXT PRIMARY KEY DEFAULT CONCAT('kpi_', UUID()),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  kpi_name VARCHAR(100) NOT NULL,
  kpi_formula TEXT, -- Formula or description
  gl_accounts_used JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_kpi_entity (entity_id),
  UNIQUE(entity_id, kpi_name)
);

CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id TEXT PRIMARY KEY DEFAULT CONCAT('forecast_', UUID()),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  forecast_period DATE NOT NULL,
  forecasted_revenue DECIMAL(14,2),
  actual_revenue DECIMAL(14,2),
  variance_amount DECIMAL(14,2),
  variance_percentage DECIMAL(6,2),
  variance_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_forecast_entity (entity_id),
  INDEX idx_forecast_period (forecast_period)
);

-- ============================================================================
-- CUSTOM REPORT BUILDER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_reports (
  id TEXT PRIMARY KEY DEFAULT CONCAT('report_', UUID()),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  report_name VARCHAR(255) NOT NULL,
  report_description TEXT,
  report_config JSON, -- Serialized column and filter config
  schedule_frequency VARCHAR(50), -- once, daily, weekly, monthly
  created_by_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_report_entity (entity_id),
  INDEX idx_report_schedule (schedule_frequency),
  UNIQUE(entity_id, report_name)
);

CREATE TABLE IF NOT EXISTS custom_report_executions (
  id TEXT PRIMARY KEY DEFAULT CONCAT('exec_', UUID()),
  custom_report_id TEXT NOT NULL REFERENCES custom_reports(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  execution_date TIMESTAMP NOT NULL,
  result_rows INT,
  export_format VARCHAR(20), -- csv, xlsx, pdf
  file_path TEXT,
  execution_status VARCHAR(50), -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_execution_report (custom_report_id),
  INDEX idx_execution_entity (entity_id),
  INDEX idx_execution_status (execution_status)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_inventory_entity_sku ON inventory_items(entity_id, sku);
CREATE INDEX idx_labor_variance_entity_period ON labor_variances(entity_id, period_date DESC);
CREATE INDEX idx_bank_transaction_entity_date ON bank_feed_transactions(entity_id, transaction_date DESC);
CREATE INDEX idx_kpi_mapping_entity ON kpi_gl_mappings(entity_id);
CREATE INDEX idx_revenue_forecast_entity_period ON revenue_forecasts(entity_id, forecast_period DESC);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
