/**
 * Financial Observers Module
 * ──────────────────────────
 * Complete financial AI and reporting system for Hospitality OS
 *
 * PHASE 2: Sentient AI Integration
 * - Echo AI Financial Observer: Real-time event observation and GL posting
 * - P&L Calculator: Real-time profit & loss calculation
 * - GL Auto-Poster: Idempotent GL entry posting service
 *
 * PHASE 3: Enterprise Scale
 * - Multi-Outlet Consolidator: 40+ outlet aggregation and rollup
 * - USALI Reporting Engine: Hospitality industry-standard reporting
 * - Advanced Forecasting Engine: ML-driven predictions and variance analysis
 */

export {
  echoAIFinancialObserver,
  type ObservedEvent,
  type FinancialDecision,
} from "./echo-ai-financial-observer";

export { pnlCalculatorRealtime, type PnLData } from "./pnl-calculator-realtime";

export {
  glAutoPostingService,
  createGLEntry,
  createBalancedGLEntries,
  type PostingResult,
} from "./gl-auto-poster";

export {
  multiOutletConsolidator,
  type OutletHierarchy,
  type ConsolidationResult,
  type ConsolidationException,
} from "./multi-outlet-consolidator";

export {
  usaliReportingEngine,
  type USALIDepartment,
  type USALIReport,
} from "./usali-reporting-engine";

export {
  advancedForecastingEngine,
  type ForecastData,
  type VarianceAnalysis,
  type VarianceDriver,
} from "./advanced-forecasting-engine";
