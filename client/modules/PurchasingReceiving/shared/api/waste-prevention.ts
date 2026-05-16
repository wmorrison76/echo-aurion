/** * Waste Prevention & Analytics API Service * Handles prevention actions, ROI tracking, variance analysis, and reporting */ import { WastePreventionAction, WastePreventionROI, WasteVarianceAnalysis, WasteCostBreakdown, SupplierWasteImpact, WasteBenchmark, WasteReport, WasteAlert, WasteAlertThreshold,
} from '@shared/types/waste'; const API_URL = '/api'; // ============================================================================
// WASTE PREVENTION ACTIONS
// ============================================================================ export async function getPreventionActions( organizationId: string, filters?: { outletId?: string; status?: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'cancelled'; wasteCategory?: string; }
): Promise<WastePreventionAction[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/prevention-actions?${params}`); if (!response.ok) throw new Error(`Failed to fetch prevention actions: ${response.statusText}`); return response.json();
} export async function getPreventionAction(actionId: string): Promise<WastePreventionAction> { const response = await fetch(`${API_URL}/prevention-actions/${actionId}`); if (!response.ok) throw new Error(`Failed to fetch prevention action: ${response.statusText}`); return response.json();
} export async function createPreventionAction( action: Omit<WastePreventionAction, 'id' | 'created_at' | 'updated_at'>
): Promise<WastePreventionAction> { const response = await fetch(`${API_URL}/prevention-actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action), }); if (!response.ok) throw new Error(`Failed to create prevention action: ${response.statusText}`); return response.json();
} export async function updatePreventionAction( actionId: string, updates: Partial<WastePreventionAction>
): Promise<WastePreventionAction> { const response = await fetch(`${API_URL}/prevention-actions/${actionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates), }); if (!response.ok) throw new Error(`Failed to update prevention action: ${response.statusText}`); return response.json();
} // ============================================================================
// PREVENTION ROI
// ============================================================================ export async function getPreventionROI( organizationId: string, filters?: { outletId?: string; completed?: boolean; }
): Promise<WastePreventionROI[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/prevention-roi?${params}`); if (!response.ok) throw new Error(`Failed to fetch prevention ROI: ${response.statusText}`); return response.json();
} export async function getPreventionROIForAction(actionId: string): Promise<WastePreventionROI | null> { const response = await fetch(`${API_URL}/prevention-actions/${actionId}/roi`); if (response.status === 404) return null; if (!response.ok) throw new Error(`Failed to fetch action ROI: ${response.statusText}`); return response.json();
} export async function createPreventionROI( roi: Omit<WastePreventionROI, 'id' | 'created_at' | 'updated_at'>
): Promise<WastePreventionROI> { const response = await fetch(`${API_URL}/prevention-roi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roi), }); if (!response.ok) throw new Error(`Failed to create prevention ROI: ${response.statusText}`); return response.json();
} export async function getTopROIActions( organizationId: string, limit: number = 10
): Promise<(WastePreventionAction & WastePreventionROI)[]> { const response = await fetch( `${API_URL}/prevention-roi/top-actions?organization_id=${organizationId}&limit=${limit}` ); if (!response.ok) throw new Error(`Failed to fetch top ROI actions: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE VARIANCE ANALYSIS
// ============================================================================ export async function getVarianceAnalysis( organizationId: string, filters?: { outletId?: string; period?: 'daily' | 'weekly' | 'monthly'; startDate?: string; endDate?: string; }
): Promise<WasteVarianceAnalysis[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/variance-analysis?${params}`); if (!response.ok) throw new Error(`Failed to fetch variance analysis: ${response.statusText}`); return response.json();
} export async function getProductVariance( organizationId: string, productId: string
): Promise<WasteVarianceAnalysis | null> { const response = await fetch( `${API_URL}/variance-analysis/${organizationId}/product/${productId}` ); if (response.status === 404) return null; if (!response.ok) throw new Error(`Failed to fetch product variance: ${response.statusText}`); return response.json();
} // ============================================================================
// COST BREAKDOWN
// ============================================================================ export async function getCostBreakdown( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<WasteCostBreakdown[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/cost-breakdown?${params}`); if (!response.ok) throw new Error(`Failed to fetch cost breakdown: ${response.statusText}`); return response.json();
} // ============================================================================
// SUPPLIER WASTE IMPACT
// ============================================================================ export async function getSupplierWasteImpact( organizationId: string, filters?: { supplierId?: string; outletId?: string; minCost?: number; }
): Promise<SupplierWasteImpact[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/supplier-waste-impact?${params}`); if (!response.ok) throw new Error(`Failed to fetch supplier waste impact: ${response.statusText}`); return response.json();
} export async function getWorstSuppliers( organizationId: string, limit: number = 10
): Promise<SupplierWasteImpact[]> { const response = await fetch( `${API_URL}/supplier-waste-impact/worst?organization_id=${organizationId}&limit=${limit}` ); if (!response.ok) throw new Error(`Failed to fetch worst suppliers: ${response.statusText}`); return response.json();
} // ============================================================================
// BENCHMARKING
// ============================================================================ export async function getBenchmarks(organizationId: string): Promise<WasteBenchmark[]> { const response = await fetch( `${API_URL}/waste-benchmarks?organization_id=${organizationId}` ); if (!response.ok) throw new Error(`Failed to fetch benchmarks: ${response.statusText}`); return response.json();
} export async function createBenchmark( benchmark: Omit<WasteBenchmark, 'id' | 'created_at' | 'updated_at'>
): Promise<WasteBenchmark> { const response = await fetch(`${API_URL}/waste-benchmarks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(benchmark), }); if (!response.ok) throw new Error(`Failed to create benchmark: ${response.statusText}`); return response.json();
} // ============================================================================
// REPORTS
// ============================================================================ export async function getWasteReports( organizationId: string, filters?: { outletId?: string; reportType?: string; startDate?: string; endDate?: string; }
): Promise<WasteReport[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-reports?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste reports: ${response.statusText}`); return response.json();
} export async function generateWasteReport( organizationId: string, reportData: { reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'; periodStart: string; periodEnd: string; outletId?: string; }
): Promise<WasteReport> { const response = await fetch(`${API_URL}/waste-reports/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization_id: organizationId, ...reportData }), }); if (!response.ok) throw new Error(`Failed to generate waste report: ${response.statusText}`); return response.json();
} export async function exportWasteReport(reportId: string, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> { const response = await fetch(`${API_URL}/waste-reports/${reportId}/export?format=${format}`); if (!response.ok) throw new Error(`Failed to export report: ${response.statusText}`); return response.blob();
} // ============================================================================
// WASTE ALERTS
// ============================================================================ export async function getWasteAlertThresholds( organizationId: string, outletId?: string
): Promise<WasteAlertThreshold[]> { const params = new URLSearchParams({ organization_id: organizationId, ...outletId ? { outlet_id: outletId } : {}, }); const response = await fetch(`${API_URL}/waste-alert-thresholds?${params}`); if (!response.ok) throw new Error(`Failed to fetch alert thresholds: ${response.statusText}`); return response.json();
} export async function createWasteAlertThreshold( threshold: Omit<WasteAlertThreshold, 'id' | 'created_at' | 'updated_at'>
): Promise<WasteAlertThreshold> { const response = await fetch(`${API_URL}/waste-alert-thresholds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(threshold), }); if (!response.ok) throw new Error(`Failed to create alert threshold: ${response.statusText}`); return response.json();
} export async function getWasteAlerts( organizationId: string, filters?: { outletId?: string; status?: 'open' | 'acknowledged' | 'resolved'; severity?: 'info' | 'warning' | 'critical'; }
): Promise<WasteAlert[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-alerts?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste alerts: ${response.statusText}`); return response.json();
} export async function acknowledgeWasteAlert(alertId: string, acknowledgedBy: string): Promise<WasteAlert> { const response = await fetch(`${API_URL}/waste-alerts/${alertId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acknowledged_by: acknowledgedBy }), }); if (!response.ok) throw new Error(`Failed to acknowledge alert: ${response.statusText}`); return response.json();
} export async function resolveWasteAlert(alertId: string, resolvedBy: string): Promise<WasteAlert> { const response = await fetch(`${API_URL}/waste-alerts/${alertId}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved_by: resolvedBy }), }); if (!response.ok) throw new Error(`Failed to resolve alert: ${response.statusText}`); return response.json();
}
