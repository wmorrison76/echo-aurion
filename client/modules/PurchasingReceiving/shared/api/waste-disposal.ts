/** * Waste Disposal API Service * Handles disposal tracking, methods, and compliance */ import { WasteDisposal, DisposalMethod, WasteDisposalCompliance, WasteEnvironmentalImpact,
} from '@shared/types/waste'; const API_URL = '/api'; // ============================================================================
// DISPOSAL METHODS
// ============================================================================ export async function getDisposalMethods(organizationId?: string): Promise<DisposalMethod[]> { const params = new URLSearchParams(organizationId ? { organization_id: organizationId } : {}); const response = await fetch(`${API_URL}/disposal-methods?${params}`); if (!response.ok) throw new Error(`Failed to fetch disposal methods: ${response.statusText}`); return response.json();
} export async function getDisposalMethod(methodId: string): Promise<DisposalMethod> { const response = await fetch(`${API_URL}/disposal-methods/${methodId}`); if (!response.ok) throw new Error(`Failed to fetch disposal method: ${response.statusText}`); return response.json();
} export async function createDisposalMethod( method: Omit<DisposalMethod, 'id' | 'created_at'>
): Promise<DisposalMethod> { const response = await fetch(`${API_URL}/disposal-methods`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(method), }); if (!response.ok) throw new Error(`Failed to create disposal method: ${response.statusText}`); return response.json();
} // ============================================================================
// WASTE DISPOSALS
// ============================================================================ export async function getWasteDisposals( organizationId: string, filters?: { outletId?: string; wasteLogId?: string; disposalMethodId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number; }
): Promise<WasteDisposal[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/waste-disposals?${params}`); if (!response.ok) throw new Error(`Failed to fetch waste disposals: ${response.statusText}`); return response.json();
} export async function getWasteDisposal(disposalId: string): Promise<WasteDisposal> { const response = await fetch(`${API_URL}/waste-disposals/${disposalId}`); if (!response.ok) throw new Error(`Failed to fetch waste disposal: ${response.statusText}`); return response.json();
} export async function createWasteDisposal( disposal: Omit<WasteDisposal, 'id' | 'created_at' | 'updated_at'>
): Promise<WasteDisposal> { const response = await fetch(`${API_URL}/waste-disposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(disposal), }); if (!response.ok) throw new Error(`Failed to create waste disposal: ${response.statusText}`); return response.json();
} export async function updateWasteDisposal( disposalId: string, updates: Partial<WasteDisposal>
): Promise<WasteDisposal> { const response = await fetch(`${API_URL}/waste-disposals/${disposalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates), }); if (!response.ok) throw new Error(`Failed to update waste disposal: ${response.statusText}`); return response.json();
} export async function bulkCreateWasteDisposals( disposals: Array<Omit<WasteDisposal, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ created: number; failed: number }> { const response = await fetch(`${API_URL}/waste-disposals/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disposals }), }); if (!response.ok) throw new Error(`Failed to bulk create waste disposals: ${response.statusText}`); return response.json();
} // ============================================================================
// DISPOSAL ANALYTICS
// ============================================================================ export async function getDisposalMethodUsage( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise< { method_id: string; method_name: string; category: string; usage_count: number; total_cost: number; total_volume_kg: number; }[]
> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/disposal-method-usage?${params}`); if (!response.ok) throw new Error(`Failed to fetch disposal method usage: ${response.statusText}`); return response.json();
} export async function getDisposalCostSummary( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<{ total_disposal_cost: number; total_disposal_revenue: number; net_disposal_cost: number; by_method: Record<string, number>;
}> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/disposal-cost-summary?${params}`); if (!response.ok) throw new Error(`Failed to fetch disposal cost summary: ${response.statusText}`); return response.json();
} // ============================================================================
// DISPOSAL COMPLIANCE
// ============================================================================ export async function getDisposalCompliance( organizationId: string, filters?: { outletId?: string; jurisdictionId?: string; compliant?: boolean; }
): Promise<WasteDisposalCompliance[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/disposal-compliance?${params}`); if (!response.ok) throw new Error(`Failed to fetch disposal compliance: ${response.statusText}`); return response.json();
} export async function createDisposalCompliance( compliance: Omit<WasteDisposalCompliance, 'id' | 'created_at'>
): Promise<WasteDisposalCompliance> { const response = await fetch(`${API_URL}/disposal-compliance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(compliance), }); if (!response.ok) throw new Error(`Failed to create disposal compliance: ${response.statusText}`); return response.json();
} export async function checkComplianceExpiration(organizationId: string): Promise< { outlet_id: string; requirement_name: string; days_until_expiration: number; status: 'expired' | 'expiring_soon' | 'valid'; }[]
> { const response = await fetch( `${API_URL}/compliance-expiration/${organizationId}` ); if (!response.ok) throw new Error(`Failed to check compliance expiration: ${response.statusText}`); return response.json();
} // ============================================================================
// ENVIRONMENTAL IMPACT
// ============================================================================ export async function getEnvironmentalImpact( organizationId: string, filters?: { outletId?: string; startDate?: string; endDate?: string; }
): Promise<WasteEnvironmentalImpact[]> { const params = new URLSearchParams({ organization_id: organizationId, ...filters || {}, }); const response = await fetch(`${API_URL}/environmental-impact?${params}`); if (!response.ok) throw new Error(`Failed to fetch environmental impact: ${response.statusText}`); return response.json();
} export async function getEnvironmentalImpactSummary( organizationId: string, outletId?: string
): Promise<{ total_waste_kg: number; landfill_waste_kg: number; recycled_waste_kg: number; composted_waste_kg: number; donated_food_kg: number; co2_emissions_equivalent_kg: number; sustainability_score: number; environmental_rating: 'excellent' | 'good' | 'fair' | 'poor';
}> { const params = new URLSearchParams({ organization_id: organizationId, ...outletId ? { outlet_id: outletId } : {}, }); const response = await fetch(`${API_URL}/environmental-summary?${params}`); if (!response.ok) throw new Error(`Failed to fetch environmental summary: ${response.statusText}`); return response.json();
} // ============================================================================
// DISPOSAL CERTIFICATES
// ============================================================================ export async function uploadDisposalCertificate( disposalId: string, certificateFile: File
): Promise<{ certificate_url: string }> { const formData = new FormData(); formData.append('certificate', certificateFile); const response = await fetch(`${API_URL}/waste-disposals/${disposalId}/certificate`, { method: 'POST', body: formData, }); if (!response.ok) throw new Error(`Failed to upload certificate: ${response.statusText}`); return response.json();
} export async function verifyDisposalCertificate( disposalId: string
): Promise<{ is_valid: boolean; certificate_number: string; issuing_authority: string; valid_until: string;
}> { const response = await fetch( `${API_URL}/waste-disposals/${disposalId}/verify-certificate` ); if (!response.ok) throw new Error(`Failed to verify certificate: ${response.statusText}`); return response.json();
}
