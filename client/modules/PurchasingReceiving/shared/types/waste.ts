export interface SpoilageRiskAssessment {
  productId: string;
  productName: string;
  outletId: string;
  organizationId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100 confidenceScore: number; // 0-1 predictedSpoilageDate: string | null; factorsContributing: Record<string, boolean>; recommendedActions: string[]; estimatedLoss: number; estimatedLossPercent: number;
}
export interface WasteLog {
  id: string;
  organization_id: string;
  outlet_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity_wasted: number;
  unit_of_measure: string;
  cost_per_unit: number;
  total_waste_cost: number;
  waste_category:
    | "spoilage"
    | "overstock"
    | "damage"
    | "prep_loss"
    | "shrinkage"
    | "theft"
    | "customer_return"
    | "quality_issue"
    | "recall"
    | "other";
  waste_reason?: string;
  root_cause?: string;
  disposal_method_id?: string;
  disposal_cost?: number;
  net_waste_cost: number;
  notes?: string;
  photo_url?: string;
  logged_by?: string;
  logged_at: string;
  created_at: string;
}
export interface DisposalMethod {
  id: string;
  code: string;
  name: string;
  category:
    | "trash"
    | "compost"
    | "recycling"
    | "donation"
    | "hazmat"
    | "return"
    | "other";
  environmental_rating: "excellent" | "good" | "fair" | "poor";
  description?: string;
  cost_per_unit?: number;
  unit?: string;
  is_active: boolean;
  created_at: string;
}
export interface WasteDailySummary {
  id: string;
  organization_id: string;
  outlet_id: string;
  day_date: string;
  total_waste_count: number;
  total_quantity_wasted: number;
  total_waste_cost: number;
  total_disposal_cost: number;
  net_waste_cost: number;
  by_category: Record<string, number>;
  top_wasted_products: Record<string, number>;
  created_at: string;
}
export interface WasteMonthlyMetrics {
  id: string;
  organization_id: string;
  outlet_id: string;
  year_month: string;
  total_waste_cost: number;
  total_disposal_cost: number;
  net_waste_cost: number;
  waste_percentage: number;
  spoilage_percentage: number;
  preventable_waste_percentage: number;
  most_wasted_category: string;
  most_wasted_product_id: string;
  vs_previous_month_change: number;
  created_at: string;
}
export interface WasteVarianceAnalysis {
  id: string;
  organization_id: string;
  outlet_id: string;
  product_id: string;
  analysis_period: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
  expected_waste_percentage: number;
  actual_waste_percentage: number;
  variance_percentage: number;
  variance_amount: number;
  variance_type: "favorable" | "unfavorable";
  significance_level: "low" | "medium" | "high" | "critical";
  contributing_factors: Record<string, unknown>;
  recommendations: string;
  created_at: string;
}
export interface WastePreventionAction {
  id: string;
  organization_id: string;
  outlet_id: string;
  title: string;
  description: string;
  action_type:
    | "process_change"
    | "training"
    | "equipment_upgrade"
    | "supplier_change"
    | "ordering_adjustment"
    | "storage_improvement"
    | "menu_change"
    | "other";
  target_waste_category?: string;
  target_product_id?: string;
  status: "proposed" | "approved" | "in_progress" | "completed" | "cancelled";
  owner?: string;
  expected_cost_savings: number;
  implementation_cost?: number;
  target_date: string;
  completed_date?: string;
  effectiveness_notes?: string;
  actual_savings?: number;
  created_at: string;
  updated_at: string;
}
export interface WasteAlertThreshold {
  id: string;
  organization_id: string;
  outlet_id: string;
  threshold_type:
    | "daily_cost"
    | "category_percentage"
    | "product_specific"
    | "variance_threshold";
  metric: string;
  threshold_value: number;
  threshold_unit: string;
  alert_severity: "info" | "warning" | "critical";
  alert_enabled: boolean;
  notify_roles: string[];
  notify_channels: string[];
  created_at: string;
  updated_at: string;
}
export interface WasteAlert {
  id: string;
  organization_id: string;
  outlet_id: string;
  threshold_id?: string;
  alert_type: string;
  alert_message: string;
  metric_value: number;
  threshold_value: number;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}
export interface WasteDisposal {
  id: string;
  waste_log_id: string;
  organization_id: string;
  outlet_id: string;
  disposal_method_id: string;
  disposal_date: string;
  disposal_time?: string;
  quantity_disposed: number;
  unit_of_measure: string;
  disposed_by?: string;
  picked_up_by?: string;
  carrier_name?: string;
  tracking_number?: string;
  cost: number;
  revenue?: number;
  certificate_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
export interface ParAdjustmentRecommendation {
  product_id: string;
  product_name: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  current_par: number;
  recommended_par: number;
  reduction_percent: number;
  estimated_monthly_savings: number;
  reason: string;
}
export interface WastePredictionResponse {
  outlet_id: string;
  organization_id: string;
  total_count: number;
  by_risk_level: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  total_estimated_loss: number;
  predictions: SpoilageRiskAssessment[];
}
export interface WasteAnalysisContext {
  outlet_id: string;
  organization_id: string;
  timestamp: string;
  waste_metrics: {
    total_waste_cost_30d: number;
    spoilage_percentage: number;
    preventable_waste_percentage: number;
    trend: "concerning" | "normal" | "improving";
  };
  spoilage_risk_summary: {
    critical_risks: number;
    high_risks: number;
    total_estimated_loss: number;
  };
  top_wasted_products: Array<{
    name: string;
    risk_level: string;
    estimated_loss: number;
  }>;
}
