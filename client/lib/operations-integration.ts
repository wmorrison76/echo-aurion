/**
 * Operations Integration Hooks
 * ============================
 * 
 * React hooks to connect Culinary, Pastry, and Inventory modules
 * to the Operations Core Engine and AI Forecasting Engine.
 * 
 * These hooks provide:
 * - Real-time ingredient cost updates
 * - Automatic recipe recosting when ingredients change
 * - Inventory consumption tracking
 * - Demand forecasting integration
 * - Production scheduling
 * - Auto-ordering suggestions
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// TYPES
// ============================================================================

export interface CanonicalIngredient {
  id: string;
  canonicalId: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  barcode?: string;
  baseUnit: string;
  currentCost: number;
  averageCost: number;
  currency: string;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  isActive: boolean;
  lastUpdated: string;
}

export interface IngredientForecast {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  unit: string;
  dailyForecasts: Array<{
    date: string;
    predictedDemand: number;
    projectedStock: number;
  }>;
  totalForecastedDemand: number;
  stockoutDate?: string;
  daysUntilStockout?: number;
  recommendedOrderDate?: string;
  recommendedOrderQuantity?: number;
  confidenceScore: number;
}

export interface RecipeCostResult {
  totalCost: number;
  costPerServing: number;
  ingredientCosts: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    lineCost: number;
  }>;
  missingIngredients: string[];
}

export interface PurchaseOrderSuggestion {
  id: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    currentStock: number;
    orderQuantity: number;
    estimatedTotalCost: number;
  }>;
  totalEstimatedCost: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface OrderSchedule {
  id: string;
  supplierId: string;
  supplierName: string;
  recommendedOrderDate: string;
  deliveryDate: string;
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    recommendedQuantity: number;
    estimatedCost: number;
  }>;
  totalEstimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rationale: string[];
}

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// OPERATIONS CORE HOOKS
// ============================================================================

/**
 * Hook to access ingredients from Operations Core
 */
export function useOperationsIngredients(outletId?: string) {
  return useQuery({
    queryKey: ['operations', 'ingredients', outletId],
    queryFn: () => fetchWithAuth(`/api/operations/ingredients${outletId ? `?outletId=${outletId}` : ''}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get low stock ingredients
 */
export function useLowStockIngredients(outletId?: string) {
  return useQuery({
    queryKey: ['operations', 'low-stock', outletId],
    queryFn: () => fetchWithAuth(`/api/operations/ingredients/low-stock${outletId ? `?outletId=${outletId}` : ''}`),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to calculate recipe cost
 */
export function useRecipeCost() {
  return useMutation({
    mutationFn: async (params: {
      recipeId: string;
      ingredients: Array<{
        recipeId: string;
        ingredientId: string;
        quantity: number;
        unit: string;
        preparation?: string;
        isOptional?: boolean;
        section?: string;
        sortOrder?: number;
      }>;
      servings?: number;
    }): Promise<RecipeCostResult> => {
      const result = await fetchWithAuth('/api/operations/recipe/cost', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return result;
    },
  });
}

/**
 * Hook to consume inventory (for production/cooking)
 */
export function useConsumeInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ingredientId: string;
      quantity: number;
      unit: string;
      referenceType: 'recipe' | 'production' | 'waste' | 'adjustment';
      referenceId: string;
      outletId?: string;
    }) => {
      return fetchWithAuth('/api/operations/inventory/consume', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      // Invalidate inventory queries
      queryClient.invalidateQueries({ queryKey: ['operations', 'ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

/**
 * Hook to receive inventory
 */
export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ingredientId: string;
      quantity: number;
      unit: string;
      unitCost: number;
      referenceId: string;
      outletId?: string;
    }) => {
      return fetchWithAuth('/api/operations/inventory/receive', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

/**
 * Hook to process an invoice
 */
export function useProcessInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      invoiceNumber: string;
      supplierId: string;
      supplierName: string;
      invoiceDate: string;
      lineItems: Array<{
        lineNumber: number;
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        totalPrice: number;
        sku?: string;
        vendorProductCode?: string;
      }>;
      outletId?: string;
    }) => {
      return fetchWithAuth('/api/operations/invoice/process', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

/**
 * Hook to get PO suggestions
 */
export function usePOSuggestions(outletId?: string) {
  return useQuery({
    queryKey: ['operations', 'po-suggestions', outletId],
    queryFn: () => fetchWithAuth(`/api/operations/po-suggestions${outletId ? `?outletId=${outletId}` : ''}`),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to schedule production
 */
export function useScheduleProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recipeId: string;
      recipeName: string;
      quantity: number;
      scheduledDate: string;
      outletId: string;
      eventId?: string;
      beoId?: string;
    }) => {
      return fetchWithAuth('/api/operations/production/schedule', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

/**
 * Hook to get operations events/audit log
 */
export function useOperationsEvents(limit?: number) {
  return useQuery({
    queryKey: ['operations', 'events', limit],
    queryFn: () => fetchWithAuth(`/api/operations/events${limit ? `?limit=${limit}` : ''}`),
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// AI FORECASTING HOOKS
// ============================================================================

/**
 * Hook to get ingredient forecast
 */
export function useIngredientForecast(ingredientId: string, outletId: string, days?: number) {
  return useQuery({
    queryKey: ['forecasting', 'ingredient', ingredientId, outletId, days],
    queryFn: () => fetchWithAuth(
      `/api/forecasting/ingredient/${ingredientId}?outletId=${outletId}${days ? `&days=${days}` : ''}`
    ),
    enabled: !!ingredientId && !!outletId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get all ingredient forecasts
 */
export function useAllForecasts(outletId?: string, days?: number) {
  return useQuery({
    queryKey: ['forecasting', 'all', outletId, days],
    queryFn: () => fetchWithAuth(
      `/api/forecasting/all${outletId ? `?outletId=${outletId}` : ''}${days ? `&days=${days}` : ''}`
    ),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get optimized order schedule
 */
export function useOrderSchedule(outletId: string, days?: number) {
  return useQuery({
    queryKey: ['forecasting', 'order-schedule', outletId, days],
    queryFn: (): Promise<{ success: boolean; data: OrderSchedule[]; summary: any }> => 
      fetchWithAuth(`/api/forecasting/order-schedule?outletId=${outletId}${days ? `&days=${days}` : ''}`),
    enabled: !!outletId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get stock alerts
 */
export function useStockAlerts(outletId?: string) {
  return useQuery({
    queryKey: ['forecasting', 'alerts', outletId],
    queryFn: () => fetchWithAuth(`/api/forecasting/alerts${outletId ? `?outletId=${outletId}` : ''}`),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Hook to add event for forecasting
 */
export function useAddForecastEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      id: string;
      name: string;
      type: 'banquet' | 'private_event' | 'holiday' | 'conference' | 'wedding' | 'regular';
      date: string;
      guestCount: number;
      outletId: string;
      menuItems?: string[];
      beoId?: string;
      status?: 'confirmed' | 'tentative' | 'cancelled';
    }) => {
      return fetchWithAuth('/api/forecasting/events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

/**
 * Hook to get forecasting stats
 */
export function useForecastingStats() {
  return useQuery({
    queryKey: ['forecasting', 'stats'],
    queryFn: () => fetchWithAuth('/api/forecasting/stats'),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get forecasting config
 */
export function useForecastingConfig() {
  return useQuery({
    queryKey: ['forecasting', 'config'],
    queryFn: () => fetchWithAuth('/api/forecasting/config'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update forecasting config
 */
export function useUpdateForecastingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<{
      forecastDays: number;
      safetyStockDays: number;
      safetyStockMultiplier: number;
      urgentStockoutDays: number;
      warningStockoutDays: number;
      enableMLPredictions: boolean;
    }>) => {
      return fetchWithAuth('/api/forecasting/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasting', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['forecasting'] });
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS (Convenience)
// ============================================================================

/**
 * Combined hook for Culinary module integration
 * Provides all operations needed for recipe costing and production
 */
export function useCulinaryOperations(outletId: string) {
  const ingredients = useOperationsIngredients(outletId);
  const lowStock = useLowStockIngredients(outletId);
  const calculateCost = useRecipeCost();
  const consumeInventory = useConsumeInventory();
  const scheduleProduction = useScheduleProduction();
  const forecasts = useAllForecasts(outletId);
  const alerts = useStockAlerts(outletId);

  return {
    // Data
    ingredients: ingredients.data?.data || [],
    lowStockIngredients: lowStock.data?.data || [],
    forecasts: forecasts.data?.data || [],
    alerts: alerts.data?.data || { urgent: [], warning: [], normal: [] },
    
    // Loading states
    isLoading: ingredients.isLoading || lowStock.isLoading,
    isForecastingLoading: forecasts.isLoading,
    
    // Actions
    calculateRecipeCost: calculateCost.mutateAsync,
    consumeIngredient: consumeInventory.mutateAsync,
    scheduleRecipeProduction: scheduleProduction.mutateAsync,
    
    // Mutation states
    isCalculating: calculateCost.isPending,
    isConsuming: consumeInventory.isPending,
    isScheduling: scheduleProduction.isPending,
  };
}

/**
 * Combined hook for Purchasing module integration
 * Provides all operations needed for automated purchasing
 */
export function usePurchasingOperations(outletId: string) {
  const poSuggestions = usePOSuggestions(outletId);
  const orderSchedule = useOrderSchedule(outletId);
  const processInvoice = useProcessInvoice();
  const receiveInventory = useReceiveInventory();
  const alerts = useStockAlerts(outletId);

  return {
    // Data
    poSuggestions: poSuggestions.data?.data || [],
    orderSchedules: orderSchedule.data?.data || [],
    urgentAlerts: alerts.data?.data?.urgent || [],
    
    // Loading states
    isLoading: poSuggestions.isLoading || orderSchedule.isLoading,
    
    // Actions
    processInvoice: processInvoice.mutateAsync,
    receiveInventory: receiveInventory.mutateAsync,
    
    // Mutation states
    isProcessing: processInvoice.isPending,
    isReceiving: receiveInventory.isPending,
    
    // Summary
    summary: orderSchedule.data?.summary,
  };
}

/**
 * Hook to get ingredient with forecast data
 */
export function useIngredientWithForecast(ingredientId: string, outletId: string) {
  const ingredients = useOperationsIngredients(outletId);
  const forecast = useIngredientForecast(ingredientId, outletId);

  const ingredient = ingredients.data?.data?.find((i: CanonicalIngredient) => i.id === ingredientId);

  return {
    ingredient,
    forecast: forecast.data?.data,
    isLoading: ingredients.isLoading || forecast.isLoading,
    hasStockoutRisk: forecast.data?.data?.daysUntilStockout !== undefined,
    daysUntilStockout: forecast.data?.data?.daysUntilStockout,
  };
}

export default {
  // Operations Core
  useOperationsIngredients,
  useLowStockIngredients,
  useRecipeCost,
  useConsumeInventory,
  useReceiveInventory,
  useProcessInvoice,
  usePOSuggestions,
  useScheduleProduction,
  useOperationsEvents,
  
  // AI Forecasting
  useIngredientForecast,
  useAllForecasts,
  useOrderSchedule,
  useStockAlerts,
  useAddForecastEvent,
  useForecastingStats,
  useForecastingConfig,
  useUpdateForecastingConfig,
  
  // Composite
  useCulinaryOperations,
  usePurchasingOperations,
  useIngredientWithForecast,
};
