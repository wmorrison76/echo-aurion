/** * Multi-tier caching layer: * 1. In-memory cache (NodeJS process) * 2. Redis cache (optional, for multi-instance) * 3. Database queries (slowest) */ import { logger } from "./logger";
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 300000; // 5 minutes private cleanupInterval: NodeJS.Timer | null = null; constructor() { this.startCleanupInterval(); } /** * Get value from cache */ get<T>(key: string): T | null { const entry = this.memoryCache.get(key); if (!entry) return null; // Check if expired const now = Date.now(); if (now - entry.timestamp > entry.ttl) { this.memoryCache.delete(key); return null; } return entry.data as T; } /** * Set value in cache */ set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void { this.memoryCache.set(key, { data, timestamp: Date.now(), ttl, }); } /** * Delete from cache */ delete(key: string): void { this.memoryCache.delete(key); } /** * Clear all cache */ clear(): void { this.memoryCache.clear(); } /** * Get or compute pattern */ async getOrCompute<T>( key: string, computeFn: () => Promise<T>, ttl?: number, ): Promise<T> { const cached = this.get<T>(key); if (cached !== null) { return cached; } const data = await computeFn(); this.set(key, data, ttl); return data; } /** * Invalidate pattern-based keys */ invalidatePattern(pattern: string): void { const regex = new RegExp(pattern); const keysToDelete: string[] = []; this.memoryCache.forEach((_, key) => { if (regex.test(key)) { keysToDelete.push(key); } }); keysToDelete.forEach((key) => this.memoryCache.delete(key)); } /** * Get cache statistics */ getStats() { const now = Date.now(); let expiredCount = 0; this.memoryCache.forEach((entry) => { if (now - entry.timestamp > entry.ttl) { expiredCount++; } }); return { totalEntries: this.memoryCache.size, expiredEntries: expiredCount, memoryUsage: this.estimateMemoryUsage(), }; } private estimateMemoryUsage(): string { const entries = Array.from(this.memoryCache.values()); const bytes = entries.reduce((sum, entry) => { return sum + JSON.stringify(entry.data).length; }, 0); if (bytes > 1024 * 1024) { return `${(bytes / (1024 * 1024)).toFixed(2)} MB`; } return `${(bytes / 1024).toFixed(2)} KB`; } private startCleanupInterval(): void { // Run cleanup every minute this.cleanupInterval = setInterval(() => { const now = Date.now(); const keysToDelete: string[] = []; this.memoryCache.forEach((entry, key) => { if (now - entry.timestamp > entry.ttl) { keysToDelete.push(key); } }); keysToDelete.forEach((key) => this.memoryCache.delete(key)); if (keysToDelete.length > 0) { logger.debug( `[CACHE] Cleaned up ${keysToDelete.length} expired entries`, ); } }, 60000); } destroy(): void { if (this.cleanupInterval) { clearInterval(this.cleanupInterval); } this.memoryCache.clear(); }
}
export const cache =
  new CacheManager(); /** * Cache key generators for common queries */
export const cacheKeys = {
  // Invoices invoice: (id: string) => `invoice:${id}`, invoicesByOrg: (orgId: string) => `invoices:org:${orgId}`, invoicesByVendor: (vendor: string) => `invoices:vendor:${vendor}`, invoicesByStatus: (status: string) => `invoices:status:${status}`, // Inventory item: (id: string) => `item:${id}`, itemsByVendor: (vendorId: string) => `items:vendor:${vendorId}`, inventory: (itemId: string) => `inventory:${itemId}`, lots: (itemId: string) => `lots:${itemId}`, // Purchase orders purchaseOrder: (id: string) => `po:${id}`, posByVendor: (vendorId: string) => `pos:vendor:${vendorId}`, posByStatus: (status: string) => `pos:status:${status}`, // Analytics analytics: (orgId: string, period: string) => `analytics:${orgId}:${period}`, vendorMetrics: (vendorId: string) => `metrics:vendor:${vendorId}`, // Recipe costing recipeCost: (recipeId: string) => `recipe:cost:${recipeId}`, menuItemCost: (menuItemId: string) => `menuitem:cost:${menuItemId}`, // GL and categorization glMappings: (vendorId: string) => `gl:mappings:${vendorId}`, glCodes: () => `gl:codes`, // Template and OCR template: (id: string) => `template:${id}`, vendorTemplates: (orgId: string) => `templates:org:${orgId}`, // Generic pattern invalidation allInvoices: () =>"invoice:", allInventory: () =>"inventory:", allOrders: () =>"po:",
}; /** * Cache invalidation helpers */
export const cacheInvalidation = {
  invoiceUpdated: (invoiceId: string, orgId: string, vendor?: string) => {
    cache.delete(cacheKeys.invoice(invoiceId));
    cache.invalidatePattern(`invoices:org:${orgId}`);
    if (vendor) {
      cache.invalidatePattern(`invoices:vendor:${vendor}`);
    }
    cache.invalidatePattern("invoices:status:");
  },
  inventoryUpdated: (itemId: string, vendorId?: string) => {
    cache.delete(cacheKeys.inventory(itemId));
    cache.delete(cacheKeys.lots(itemId));
    cache.invalidatePattern("inventory:");
    if (vendorId) {
      cache.invalidatePattern(`items:vendor:${vendorId}`);
    }
  },
  purchaseOrderUpdated: (poId: string, vendorId?: string, status?: string) => {
    cache.delete(cacheKeys.purchaseOrder(poId));
    if (vendorId) {
      cache.invalidatePattern(`pos:vendor:${vendorId}`);
    }
    if (status) {
      cache.invalidatePattern(`pos:status:${status}`);
    }
  },
  recipeUpdated: (recipeId: string) => {
    cache.delete(cacheKeys.recipeCost(recipeId));
    cache.invalidatePattern("menuitem:cost:");
  },
  analyticsUpdated: (orgId: string) => {
    cache.invalidatePattern(`analytics:${orgId}:`);
    cache.invalidatePattern(`metrics:vendor:`);
  },
  allInvalidated: () => {
    cache.clear();
  },
};
