/** * Waste Logs API Service * Handles waste tracking, logging, and basic CRUD operations */ import { WasteLog, WasteDailySummary, WasteMonthlyMetrics, WasteCategory, RootCause,
} from '@shared/types/waste'; const API_URL = '/api'; // ============================================================================
// WASTE LOGS
// ============================================================================ export async function getWasteLogs( organizationId: string, filters?: { outletId?: string; productId?: string; wasteCategory?: WasteCategory; startDate?: string; endDate?: string; limit?: number; offset?: number; }
): Promise<WasteLog[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-logs?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste logs: ${response.statusText}`); return response.json();
} export async function getWasteLog(logId: string): Promise<WasteLog> { const response = await fetch(`${API_URL}/waste-logs/${logId}`); if (!response.ok) throw new Error(`Failed to fetch waste log: ${response.statusText}`); return response.json();
} export async function createWasteLog(log: Omit<WasteLog, 'id' | 'created_at' | 'logged_at'>): Promise<WasteLog> { const response = await fetch(`${API_URL}/waste-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log), }); if (!response.ok) throw new Error(`Failed to create waste log: ${response.statusText}`); return response.json();
} export async function updateWasteLog(logId: string, updates: Partial<WasteLog>): Promise<WasteLog> { const response = await fetch(`${API_URL}/waste-logs/${logId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates), }); if (!response.ok) throw new Error(`Failed to update waste log: ${response.statusText}`); return response.json();
} export async function deleteWasteLog(logId: string): Promise<void> { const response = await fetch(`${API_URL}/waste-logs/${logId}`, { method: 'DELETE', }); if (!response.ok) throw new Error(`Failed to delete waste log: ${response.statusText}`);
} export async function bulkCreateWasteLogs(logs: Array<Omit<WasteLog, 'id' | 'created_at' | 'logged_at'>>): Promise<{ created: number; failed: number }> { const response = await fetch(`${API_URL}/waste-logs/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logs }), }); if (!response.ok) throw new Error(`Failed to bulk create waste logs: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE DAILY SUMMARY
// ============================================================================ export async function getWasteDailySummary( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<WasteDailySummary[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-daily-summary?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste daily summary: ${response.statusText}`); return response.json();
} export async function getWasteDailySummaryByDate( organizationId: string, outletId: string, date: string
): Promise<WasteDailySummary | null> { const response = await fetch( `${API_URL}/waste-daily-summary/${organizationId}/${outletId}/${date}` ); if (response.status === 404) return null; if (!response.ok) throw new Error(`Failed to fetch daily summary: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE MONTHLY METRICS
// ============================================================================ export async function getWasteMonthlyMetrics( organizationId: string, filters?: { outletId?: string; startMonth?: string; endMonth?: string; }
): Promise<WasteMonthlyMetrics[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-monthly-metrics?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste monthly metrics: ${response.statusText}`); return response.json();
} export async function getWasteMonthlyMetricsByMonth( organizationId: string, outletId: string, yearMonth: string
): Promise<WasteMonthlyMetrics | null> { const response = await fetch( `${API_URL}/waste-monthly-metrics/${organizationId}/${outletId}/${yearMonth}` ); if (response.status === 404) return null; if (!response.ok) throw new Error(`Failed to fetch monthly metrics: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE CATEGORY ANALYSIS
// ============================================================================ export async function getWasteCategoryBreakdown( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<Record<WasteCategory, number>> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-category-breakdown?${params}`); if (!response.ok) throw new Error(`Failed to fetch category breakdown: ${response.statusText}`); return response.json();
} export async function getWasteRootCauseAnalysis( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<Record<RootCause, number>> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-root-cause-analysis?${params}`); if (!response.ok) throw new Error(`Failed to fetch root cause analysis: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE COST ANALYTICS
// ============================================================================ export async function getWasteCostTrend( organizationId: string, outletId?: string, days: number = 30
): Promise< { date: string; total_cost: number; by_category: Record<string, number>; }[]
> { const params = new URLSearchParams({ organization_id: organizationId, days: days.toString(), ...outletId ? { outlet_id: outletId } : {}, }); const response = await fetch(`${API_URL}/waste-cost-trend?${params}`); if (!response.ok) throw new Error(`Failed to fetch cost trend: ${response.statusText}`); return response.json();
} export async function getWasteMetrics( organizationId: string, outletId?: string
): Promise<{ total_waste_cost: number; avg_daily_waste: number; waste_percentage: number; spoilage_percentage: number; trend: 'improving' | 'stable' | 'worsening';
}> { const params = new URLSearchParams({ organization_id: organizationId, ...outletId ? { outlet_id: outletId } : {}, }); const response = await fetch(`${API_URL}/waste-metrics?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste metrics: ${response.statusText}`); return response.json();
} // ============================================================================
// TOP WASTED ITEMS
// ============================================================================ export async function getTopWastedProducts( organizationId: string, filters?: { outletId?: string; limit?: number; wasteCategory?: WasteCategory; }
): Promise< { product_id: string; product_name: string; total_waste_cost: number; waste_count: number; }[]
> { const params = new URLSearchParams({ organization_id: organizationId, limit: (filters?.limit || 10).toString(), ...filters || {}, }); const response = await fetch(`${API_URL}/waste-top-products?${params}`); if (!response.ok) throw new Error(`Failed to fetch top wasted products: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE COMPARISON
// ============================================================================ export async function compareWasteBetweenOutlets( organizationId: string, outletIds: string[], dateRange?: { startDate: string; endDate: string }
): Promise< { outlet_id: string; outlet_name: string; total_waste_cost: number; waste_percentage: number; rank: number; }[]
> { const params = new URLSearchParams({ organization_id: organizationId, outlet_ids: outletIds.join(','), ...dateRange || {}, }); const response = await fetch(`${API_URL}/waste-comparison?${params}`); if (!response.ok) throw new Error(`Failed to compare waste: ${response.statusText}`); return response.json();
} export async function compareWasteVsPreviousPeriod( organizationId: string, outletId?: string
): Promise<{ current_period_cost: number; previous_period_cost: number; change_amount: number; change_percentage: number; trend: 'improving' | 'worsening';
}> { const params = new URLSearchParams({ organization_id: organizationId, ...outletId ? { outlet_id: outletId } : {}, }); const response = await fetch(`${API_URL}/waste-period-comparison?${params}`); if (!response.ok) throw new Error(`Failed to compare periods: ${response.statusText}`); return response.json();
}
