/** * Invoice Management Hook * Handles invoice fetching, searching, and preference tracking */ import {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import * as invoiceAPI from "@shared/api/invoices";
import { logger } from "@/lib/logger";
import {
  getRecentSearches,
  addRecentSearch,
  getGroupedRecentSearches,
} from "@/lib/user-preferences";
import type {
  Invoice,
  Vendor,
  GLCode,
  GLCodeCategory,
  InvoiceLineItem,
  InvoiceImage,
  InvoiceMetrics,
} from "@shared/types/invoices";
interface UseInvoicesOptions {
  outletId: string;
  userId: string;
}
interface SearchFilters {
  vendorId?: string;
  glCategory?: GLCodeCategory;
  status?: string;
  startDate?: string;
  endDate?: string;
}
export function useInvoices({ outletId, userId }: UseInvoicesOptions) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [glCodes, setGLCodes] = useState<GLCode[]>([]);
  const [metrics, setMetrics] = useState<InvoiceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({}); // Load invoices const loadInvoices = useCallback( async (filtersToUse?: SearchFilters) => { setIsLoading(true); setError(null); try { const filtersActual = filtersToUse || filters; const data = await invoiceAPI.getInvoices(outletId, filtersActual); setInvoices(data); } catch (err) { setError( err instanceof Error ? err.message :"Failed to load invoices", ); } finally { setIsLoading(false); } }, [outletId, filters], ); // Search invoices const searchInvoices = useCallback( async (query: string, searchFilters?: SearchFilters) => { setIsLoading(true); setError(null); setSearchQuery(query); try { const data = await invoiceAPI.searchInvoices( outletId, query, searchFilters, ); setInvoices(data); // Track search preference if (query || searchFilters?.vendorId || searchFilters?.glCategory) { addRecentSearch(userId, outletId, { vendorId: searchFilters?.vendorId, glCategory: searchFilters?.glCategory, searchTerm: query, }); } if (searchFilters) { setFilters(searchFilters); } } catch (err) { setError( err instanceof Error ? err.message :"Failed to search invoices", ); } finally { setIsLoading(false); } }, [outletId, userId], ); // Load vendors (optional - vendors may not exist in database yet) const loadVendors = useCallback(async (organizationId: string) => { try { const data = await invoiceAPI.getVendors(organizationId, true); setVendors(data); } catch (err) { // Silently fail - vendors are optional logger.debug("Could not load vendors:", err); setVendors([]); } }, []); // Load GL codes (optional - GL codes may not exist in database yet) const loadGLCodes = useCallback(async (organizationId: string) => { try { const data = await invoiceAPI.getGLCodes(organizationId); setGLCodes(data); } catch (err) { // Silently fail - GL codes are optional logger.debug("Could not load GL codes:", err); setGLCodes([]); } }, []); // Load metrics const loadMetrics = useCallback(async () => { try { const data = await invoiceAPI.getInvoiceMetrics(outletId); setMetrics(data); } catch (err) { setError(err instanceof Error ? err.message :"Failed to load metrics"); } }, [outletId]); // Get recent searches const recentSearches = useMemo( () => getGroupedRecentSearches(userId, outletId), [userId, outletId], ); // Perform initial load (only if we have an outlet ID) useEffect(() => { if (outletId) { loadInvoices(); } }, [outletId, loadInvoices]); // CRUD operations const createInvoice = useCallback( async (invoice: Omit<Invoice,"id" |"created_at" |"updated_at">) => { try { const newInvoice = await invoiceAPI.createInvoice(invoice); setInvoices((prev) => [newInvoice, ...prev]); return newInvoice; } catch (err) { throw err instanceof Error ? err : new Error("Failed to create invoice"); } }, [], ); const updateInvoice = useCallback( async ( invoiceId: string, updates: Partial<Omit<Invoice,"id" |"created_at" |"updated_at">>, ) => { try { const updated = await invoiceAPI.updateInvoice(invoiceId, updates); setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updated : inv)), ); return updated; } catch (err) { throw err instanceof Error ? err : new Error("Failed to update invoice"); } }, [], ); const deleteInvoice = useCallback(async (invoiceId: string) => { try { await invoiceAPI.deleteInvoice(invoiceId); setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId)); } catch (err) { throw err instanceof Error ? err : new Error("Failed to delete invoice"); } }, []); // Image operations const uploadInvoiceImage = useCallback( async (invoiceId: string, file: File, pageNumber?: number) => { try { return await invoiceAPI.uploadInvoiceImage(invoiceId, file, pageNumber); } catch (err) { throw err instanceof Error ? err : new Error("Failed to upload image"); } }, [], ); const getInvoiceImages = useCallback(async (invoiceId: string) => { try { return await invoiceAPI.getInvoiceImages(invoiceId); } catch (err) { throw err instanceof Error ? err : new Error("Failed to fetch images"); } }, []); return { // State invoices, vendors, glCodes, metrics, isLoading, error, searchQuery, filters, recentSearches, // Invoice operations loadInvoices, searchInvoices, createInvoice, updateInvoice, deleteInvoice, // Vendor operations loadVendors, // GL Code operations loadGLCodes, // Metrics loadMetrics, // Image operations uploadInvoiceImage, getInvoiceImages, // Filters setFilters, setSearchQuery, };
}
