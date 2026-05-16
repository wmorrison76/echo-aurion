/** * Accounting Management Hook * Handles AP, payments, GL entries, and P&L reporting with pagination support */ import {
  useState,
  useCallback,
  useEffect,
} from "react";
import * as accountingAPI from "@shared/api/accounting";
import type {
  InvoicePayment,
  PaymentSchedule,
  PandLStatement,
  FinancialMetrics,
  VendorAnalysis,
  PaginationMeta,
} from "@shared/types/accounting";
interface UseAccountingOptions {
  organizationId: string;
  outletId?: string;
  pageSize?: number;
}
interface PaginationState {
  offset: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
  currentPage: number;
}
export function useAccounting({
  organizationId,
  outletId,
  pageSize = 20,
}: UseAccountingOptions) {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [pandl, setPandL] = useState<PandLStatement | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [vendorAnalyses, setVendorAnalyses] = useState<VendorAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString(),
  ); // Pagination state const [paymentsPagination, setPaymentsPagination] = useState<PaginationState>({ offset: 0, limit: pageSize, total: 0, hasNext: false, hasPrev: false, totalPages: 0, currentPage: 1, }); const [schedulesPagination, setSchedulesPagination] = useState<PaginationState>({ offset: 0, limit: pageSize, total: 0, hasNext: false, hasPrev: false, totalPages: 0, currentPage: 1, }); const [vendorsPagination, setVendorsPagination] = useState<PaginationState>({ offset: 0, limit: pageSize, total: 0, hasNext: false, hasPrev: false, totalPages: 0, currentPage: 1, }); // Load payments with pagination const loadPayments = useCallback( async (pageNum?: number) => { setIsLoading(true); setError(null); try { const page = pageNum ?? paymentsPagination.currentPage; const offset = (page - 1) * pageSize; const response = await accountingAPI.getPaymentsByOrganization( organizationId, { limit: pageSize, offset, ...(outletId && { vendor_id: outletId }), }, ); setPayments(response.data); setPaymentsPagination({ offset: response.pagination.offset, limit: response.pagination.limit, total: response.pagination.total, hasNext: response.pagination.hasNext, hasPrev: response.pagination.hasPrev, totalPages: response.pagination.totalPages, currentPage: page, }); setLastUpdated(new Date().toISOString()); } catch (err) { setError(err instanceof Error ? err.message :"Failed to load payments"); } finally { setIsLoading(false); } }, [organizationId, outletId, pageSize, paymentsPagination.currentPage], ); // Load schedules with pagination const loadSchedules = useCallback( async (pageNum?: number) => { try { const page = pageNum ?? schedulesPagination.currentPage; const offset = (page - 1) * pageSize; const response = await accountingAPI.getPaymentSchedules( organizationId, ); // Handle pagination metadata setSchedules(response.data); if (response.pagination) { setSchedulesPagination({ offset: response.pagination.offset, limit: response.pagination.limit, total: response.pagination.total, hasNext: response.pagination.hasNext, hasPrev: response.pagination.hasPrev, totalPages: response.pagination.totalPages, currentPage: page, }); } } catch (err) { setError(err instanceof Error ? err.message :"Failed to load schedules"); } }, [organizationId, pageSize, schedulesPagination.currentPage], ); // Load P&L const loadPandL = useCallback( async (startDate: string, endDate: string) => { try { const data = await accountingAPI.generatePandLStatement( organizationId, startDate, endDate, outletId, ); setPandL(data); } catch (err) { setError(err instanceof Error ? err.message :"Failed to load P&L"); } }, [organizationId, outletId], ); // Load metrics const loadMetrics = useCallback(async () => { try { const data = await accountingAPI.getFinancialMetrics( organizationId, outletId, ); setMetrics(data); } catch (err) { setError(err instanceof Error ? err.message :"Failed to load metrics"); } }, [organizationId, outletId]); // Load vendor analyses with pagination const loadVendorAnalyses = useCallback( async (pageNum?: number) => { try { const page = pageNum ?? vendorsPagination.currentPage; const response = await accountingAPI.getTopVendors( organizationId, outletId, pageSize, ); setVendorAnalyses(response.data); if (response.pagination) { setVendorsPagination({ offset: response.pagination.offset, limit: response.pagination.limit, total: response.pagination.total, hasNext: response.pagination.hasNext, hasPrev: response.pagination.hasPrev, totalPages: response.pagination.totalPages, currentPage: page, }); } } catch (err) { setError( err instanceof Error ? err.message :"Failed to load vendor analysis", ); } }, [organizationId, outletId, pageSize, vendorsPagination.currentPage], ); // Initial load - only depend on organizationId and outletId, not callbacks useEffect(() => { if (!organizationId) return; // Don't load if no organization loadPayments(); loadSchedules(); loadMetrics(); loadVendorAnalyses(); }, [organizationId, outletId]); // Only depend on the actual data, not callbacks // Poll for updates (hourly or configurable) useEffect(() => { if (!organizationId) return; // Don't poll if no organization const pollInterval = setInterval(() => { loadPayments(); loadMetrics(); }, 3600000); // 1 hour return () => clearInterval(pollInterval); }, [organizationId, outletId]); // Create payment const createPayment = useCallback( async ( payment: Omit<InvoicePayment,"id" |"created_at" |"updated_at">, ) => { try { const newPayment = await accountingAPI.createPayment(payment); setPayments((prev) => [newPayment, ...prev]); return newPayment; } catch (err) { throw err instanceof Error ? err : new Error("Failed to create payment"); } }, [], ); // Suggest payments const suggestPayments = useCallback(async () => { try { const suggested = await accountingAPI.suggestPayments( organizationId, outletId, ); return suggested; } catch (err) { throw err instanceof Error ? err : new Error("Failed to get suggestions"); } }, [organizationId, outletId]); // Run payment batch const runPaymentBatch = useCallback( async (paymentIds: string[]) => { try { await accountingAPI.runPaymentBatch(organizationId, paymentIds); await loadPayments(1); // Reset to first page after batch operation } catch (err) { throw err instanceof Error ? err : new Error("Failed to run batch"); } }, [organizationId, loadPayments], ); // Pagination helpers for payments const goToPaymentPage = useCallback( (page: number) => { if (page > 0 && page <= paymentsPagination.totalPages) { loadPayments(page); } }, [loadPayments, paymentsPagination.totalPages], ); const nextPaymentPage = useCallback(() => { if (paymentsPagination.hasNext) { goToPaymentPage(paymentsPagination.currentPage + 1); } }, [paymentsPagination, goToPaymentPage]); const prevPaymentPage = useCallback(() => { if (paymentsPagination.hasPrev) { goToPaymentPage(paymentsPagination.currentPage - 1); } }, [paymentsPagination, goToPaymentPage]); // Pagination helpers for vendors const goToVendorPage = useCallback( (page: number) => { if (page > 0 && page <= vendorsPagination.totalPages) { loadVendorAnalyses(page); } }, [loadVendorAnalyses, vendorsPagination.totalPages], ); const nextVendorPage = useCallback(() => { if (vendorsPagination.hasNext) { goToVendorPage(vendorsPagination.currentPage + 1); } }, [vendorsPagination, goToVendorPage]); const prevVendorPage = useCallback(() => { if (vendorsPagination.hasPrev) { goToVendorPage(vendorsPagination.currentPage - 1); } }, [vendorsPagination, goToVendorPage]); return { // State payments, schedules, pandl, metrics, vendorAnalyses, isLoading, error, lastUpdated, // Pagination state paymentsPagination, schedulesPagination, vendorsPagination, // Operations createPayment, suggestPayments, runPaymentBatch, // Loaders loadPayments, loadSchedules, loadPandL, loadMetrics, loadVendorAnalyses, // Pagination controls goToPaymentPage, nextPaymentPage, prevPaymentPage, goToVendorPage, nextVendorPage, prevVendorPage, };
}
