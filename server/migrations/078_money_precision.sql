-- Migration: Money column precision standard (B3)
-- Purpose: Establish NUMERIC(18,2) as the canonical precision for every
--          currency column in the platform, and NUMERIC(18,6) for FX
--          rates. The 409A reviewer's concern was that some tables held
--          money in NUMERIC(12,2), which caps at $9.99 trillion — fine
--          for a single hotel, but tight at the multi-property /
--          enterprise-portfolio scale the platform claims to serve.
--          NUMERIC(18,2) caps at $9.99 quadrillion: comfortable for any
--          casino aggregate, multi-property roll-up, or 30-year P&L.
--
--          B1 added the Money primitive (Decimal.js wire format).
--          B2 made the GL posting engine + Argus guardian use it for
--          strict balance equality.
--          B3 widens the persistence layer to match: every dollar
--          column is now NUMERIC(18,2), every FX rate NUMERIC(18,6).
--
--          Each ALTER is idempotent (USING column_name::NUMERIC(18,2))
--          and safe to re-run. Tables that don't exist in this DB are
--          skipped via DO blocks; the migration runs cleanly on Aurum-
--          managed databases (where the table exists) and on dev shim
--          (where the migration is a no-op).
--
-- Ticket:  B3 (final ticket of Sequence B)
-- Date:    2026-05-06

-- =========================================================================
-- HELPERS
-- =========================================================================

CREATE OR REPLACE FUNCTION pg_temp.widen_money_column(
  p_table TEXT,
  p_column TEXT,
  p_target TEXT DEFAULT 'NUMERIC(18,2)'
) RETURNS VOID AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = p_table AND column_name = p_column
  ) INTO v_exists;
  IF v_exists THEN
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',
      p_table, p_column, p_target, p_column, p_target
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- MONEY COLUMNS — widen NUMERIC(12,2) / DECIMAL(15,2) → NUMERIC(18,2)
-- =========================================================================

-- prospects (001)
SELECT pg_temp.widen_money_column('prospects', 'estimated_revenue');

-- calendar_events (004) + calendar_analytics (003)
SELECT pg_temp.widen_money_column('calendar_events', 'revenue');
SELECT pg_temp.widen_money_column('calendar_analytics', 'total_revenue');
SELECT pg_temp.widen_money_column('calendar_analytics', 'average_revenue_per_event');
SELECT pg_temp.widen_money_column('calendar_analytics', 'revenue_per_guest');
SELECT pg_temp.widen_money_column('calendar_analytics', 'predicted_revenue');

-- recipe scaling (014)
SELECT pg_temp.widen_money_column('scaled_ingredients', 'unit_cost');
SELECT pg_temp.widen_money_column('scaled_ingredients', 'total_cost');
SELECT pg_temp.widen_money_column('event_purchase_orders', 'total_cost');

-- labor / production tasks (015, 016)
SELECT pg_temp.widen_money_column('maestro_production_tasks', 'estimated_labor_cost');
SELECT pg_temp.widen_money_column('maestro_production_tasks', 'actual_labor_cost');
SELECT pg_temp.widen_money_column('maestro_production_tasks', 'actual_labor_cost_final');
SELECT pg_temp.widen_money_column('staff_assignment_analytics', 'estimated_labor_cost');
SELECT pg_temp.widen_money_column('staff_assignment_analytics', 'actual_labor_cost');
SELECT pg_temp.widen_money_column('staff_assignment_analytics', 'cost_variance');

-- ML forecasting (017)
SELECT pg_temp.widen_money_column('ml_labor_forecasts', 'predicted_labor_cost');
SELECT pg_temp.widen_money_column('ml_labor_forecasts', 'lower_bound_cost');
SELECT pg_temp.widen_money_column('ml_labor_forecasts', 'upper_bound_cost');

-- CRM (058, 060, 061)
SELECT pg_temp.widen_money_column('crm_next_actions', 'amount');
SELECT pg_temp.widen_money_column('crm_next_actions', 'commission_amount');
SELECT pg_temp.widen_money_column('crm_revenue_goals', 'target_revenue');
SELECT pg_temp.widen_money_column('crm_revenue_goals', 'actual_revenue');
SELECT pg_temp.widen_money_column('crm_sales_goals', 'target_amount');
SELECT pg_temp.widen_money_column('crm_sales_goals', 'actual_amount');

-- Resort forecast (062)
SELECT pg_temp.widen_money_column('resort_forecasts', 'forecast_revenue');
SELECT pg_temp.widen_money_column('resort_forecasts', 'actual_revenue');

-- POS registry (065)
SELECT pg_temp.widen_money_column('pos_registers', 'opening_balance');
SELECT pg_temp.widen_money_column('pos_registers', 'closing_balance');

-- Forecast system (066)
SELECT pg_temp.widen_money_column('forecast_capture_rates', 'expected_revenue');
SELECT pg_temp.widen_money_column('forecast_capture_rates', 'actual_revenue');

-- Consolidated purchasing — A4 / A4.5 (073)
SELECT pg_temp.widen_money_column('event_purchase_orders', 'unit_cost');
SELECT pg_temp.widen_money_column('event_purchase_orders', 'quantity');
SELECT pg_temp.widen_money_column('purchase_consolidations', 'total_cost');

-- =========================================================================
-- AURUM TABLES — the load-bearing GL persistence (if they exist)
-- =========================================================================
-- These tables are managed by EchoAurum's own service layer (aurumDatabase.ts)
-- rather than this migration tree, so they may or may not exist depending on
-- how the deployment provisions them. The widen_money_column helper is a
-- no-op when the table is absent, so this migration is safe on every shape
-- of deploy.

-- journal_entries
SELECT pg_temp.widen_money_column('journal_entries', 'totalDebits');
SELECT pg_temp.widen_money_column('journal_entries', 'totalCredits');
SELECT pg_temp.widen_money_column('journal_entries', 'total_debits');
SELECT pg_temp.widen_money_column('journal_entries', 'total_credits');

-- journal_lines
SELECT pg_temp.widen_money_column('journal_lines', 'debitAmount');
SELECT pg_temp.widen_money_column('journal_lines', 'creditAmount');
SELECT pg_temp.widen_money_column('journal_lines', 'debit_amount');
SELECT pg_temp.widen_money_column('journal_lines', 'credit_amount');

-- ap_invoices
SELECT pg_temp.widen_money_column('ap_invoices', 'amount');
SELECT pg_temp.widen_money_column('ap_invoices', 'tax_amount');
SELECT pg_temp.widen_money_column('ap_invoices', 'total_amount');
SELECT pg_temp.widen_money_column('ap_invoices', 'paid_amount');

-- aurum_payments
SELECT pg_temp.widen_money_column('aurum_payments', 'amount');
SELECT pg_temp.widen_money_column('aurum_payments', 'fee_amount');

-- consolidation_entries
SELECT pg_temp.widen_money_column('consolidation_entries', 'amount');
SELECT pg_temp.widen_money_column('consolidation_entries', 'converted_amount');
SELECT pg_temp.widen_money_column('consolidation_entries', 'original_amount');

-- elimination_entries
SELECT pg_temp.widen_money_column('elimination_entries', 'debit_amount');
SELECT pg_temp.widen_money_column('elimination_entries', 'credit_amount');

-- minority_interest_entries
SELECT pg_temp.widen_money_column('minority_interest_entries', 'net_income_child');
SELECT pg_temp.widen_money_column('minority_interest_entries', 'minority_interest_amount');

-- =========================================================================
-- FX RATES — NUMERIC(18,6) for currency rates
-- =========================================================================

SELECT pg_temp.widen_money_column('exchange_rates', 'rate', 'NUMERIC(18,6)');
SELECT pg_temp.widen_money_column('consolidation_entries', 'exchange_rate', 'NUMERIC(18,6)');
SELECT pg_temp.widen_money_column('currency_translations', 'rate', 'NUMERIC(18,6)');

-- =========================================================================
-- DOCUMENTATION
-- =========================================================================

COMMENT ON SCHEMA public IS
  'Money precision standard (B3, 2026-05-06): every currency column is '
  'NUMERIC(18,2); every FX rate is NUMERIC(18,6). Use the Money primitive '
  '(server/lib/money.ts) for all in-code arithmetic — never raw number.';
