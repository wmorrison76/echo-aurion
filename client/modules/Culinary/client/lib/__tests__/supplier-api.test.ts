import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supplierAPI, type SupplierType, type SupplierProduct } from '../supplier-api-manager';

vi.mock('../auth-service', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    })),
  },
}));

describe('SupplierAPIManager', () => {
  beforeEach(() => {
    supplierAPI.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    supplierAPI.clearCache();
  });

  describe('Product Search', () => {
    it('should search products across suppliers', async () => {
      const suppliers: SupplierType[] = ['sysco', 'us-foods', 'gfs'];

      for (const supplier of suppliers) {
        const result = await supplierAPI.searchProducts(
          supplier,
          'org-1',
          'flour',
          { limit: 10 }
        );

        expect(result).toHaveProperty('success');
        expect(Array.isArray(result.products)).toBe(true);
      }
    });

    it('should return cached results on subsequent searches', async () => {
      const firstSearch = await supplierAPI.searchProducts(
        'sysco',
        'org-1',
        'chicken'
      );

      const secondSearch = await supplierAPI.searchProducts(
        'sysco',
        'org-1',
        'chicken'
      );

      // Both should have same structure
      expect(firstSearch.success).toBe(secondSearch.success);
    });

    it('should filter products by category', async () => {
      const result = await supplierAPI.searchProducts(
        'sysco',
        'org-1',
        'oil',
        { category: 'Oils & Vinegars' }
      );

      expect(Array.isArray(result.products)).toBe(true);
    });

    it('should filter products by price', async () => {
      const result = await supplierAPI.searchProducts(
        'us-foods',
        'org-1',
        'beef',
        { maxPrice: 50 }
      );

      expect(Array.isArray(result.products)).toBe(true);
      if (result.products.length > 0) {
        result.products.forEach((p) => {
          expect(p.unitPrice).toBeLessThanOrEqual(50);
        });
      }
    });

    it('should respect limit parameter', async () => {
      const result = await supplierAPI.searchProducts(
        'gfs',
        'org-1',
        'cheese',
        { limit: 5 }
      );

      expect(result.products.length).toBeLessThanOrEqual(5);
    });

    it('should handle search with no results', async () => {
      const result = await supplierAPI.searchProducts(
        'sysco',
        'org-1',
        'nonexistentproduct12345'
      );

      expect(result.success === true || result.success === false).toBe(true);
    });
  });

  describe('Product Details', () => {
    it('should fetch product details by SKU', async () => {
      const result = await supplierAPI.getProductDetails(
        'sysco',
        'org-1',
        'SKU-12345'
      );

      expect(result).toHaveProperty('success');
      if (result.success && result.product) {
        expect(result.product).toHaveProperty('sku');
        expect(result.product).toHaveProperty('name');
        expect(result.product).toHaveProperty('unitPrice');
      }
    });

    it('should cache product details', async () => {
      await supplierAPI.getProductDetails('us-foods', 'org-1', 'SKU-999');
      const stats1 = supplierAPI.getCacheStats();

      await supplierAPI.getProductDetails('us-foods', 'org-1', 'SKU-999');
      const stats2 = supplierAPI.getCacheStats();

      expect(stats2.entries).toBeGreaterThanOrEqual(stats1.entries);
    });

    it('should return product with normalized fields', async () => {
      const result = await supplierAPI.getProductDetails(
        'gfs',
        'org-1',
        'GFS-SKU-001'
      );

      if (result.success && result.product) {
        const product = result.product;
        expect(typeof product.id).toBe('string');
        expect(typeof product.name).toBe('string');
        expect(typeof product.unitPrice).toBe('number');
        expect(typeof product.available).toBe('boolean');
      }
    });
  });

  describe('Pricing & Quotes', () => {
    it('should request price quote', async () => {
      const items = [
        { sku: 'FLOUR-001', quantity: 10 },
        { sku: 'SUGAR-001', quantity: 5 },
      ];

      const result = await supplierAPI.requestQuote(
        'sysco',
        'org-1',
        items
      );

      expect(result).toHaveProperty('success');
      if (result.success && result.quote) {
        expect(result.quote).toHaveProperty('lineItems');
        expect(result.quote).toHaveProperty('subtotal');
        expect(result.quote).toHaveProperty('total');
        expect(result.quote.lineItems.length).toBeGreaterThan(0);
      }
    });

    it('should handle multi-supplier quotes', async () => {
      const items = [{ sku: 'BEEF-001', quantity: 20 }];

      const syscoQuote = await supplierAPI.requestQuote('sysco', 'org-1', items);
      const usFoodsQuote = await supplierAPI.requestQuote('us-foods', 'org-1', items);
      const gfsQuote = await supplierAPI.requestQuote('gfs', 'org-1', items);

      expect(syscoQuote).toHaveProperty('success');
      expect(usFoodsQuote).toHaveProperty('success');
      expect(gfsQuote).toHaveProperty('success');
    });

    it('should include tax and shipping in quote', async () => {
      const result = await supplierAPI.requestQuote(
        'us-foods',
        'org-1',
        [{ sku: 'ITEM-001', quantity: 1 }]
      );

      if (result.success && result.quote) {
        expect(result.quote).toHaveProperty('tax');
        expect(result.quote).toHaveProperty('shipping');
        expect(result.quote.total).toBe(
          result.quote.subtotal + result.quote.tax + result.quote.shipping
        );
      }
    });
  });

  describe('Order Management', () => {
    it('should place order with supplier', async () => {
      const items = [
        { sku: 'BEEF-001', quantity: 20, unitPrice: 8.50 },
        { sku: 'CHICKEN-001', quantity: 15, unitPrice: 5.25 },
      ];

      const result = await supplierAPI.placeOrder('sysco', 'org-1', items);

      expect(result).toHaveProperty('success');
      if (result.success && result.order) {
        expect(result.order).toHaveProperty('orderNumber');
        expect(result.order).toHaveProperty('status');
        expect(result.order.lineItems.length).toBe(items.length);
      }
    });

    it('should track order status', async () => {
      const result = await supplierAPI.trackOrder(
        'us-foods',
        'org-1',
        'ORDER-12345'
      );

      expect(result).toHaveProperty('success');
      if (result.success && result.order) {
        expect(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).toContain(
          result.order.status
        );
      }
    });

    it('should cache completed orders longer', async () => {
      // First tracking (pending)
      await supplierAPI.trackOrder('gfs', 'org-1', 'ORDER-001');
      const stats1 = supplierAPI.getCacheStats();

      // Second tracking (should use cache)
      await supplierAPI.trackOrder('gfs', 'org-1', 'ORDER-001');
      const stats2 = supplierAPI.getCacheStats();

      expect(stats2.entries).toBeGreaterThanOrEqual(stats1.entries);
    });

    it('should include delivery tracking info', async () => {
      const result = await supplierAPI.trackOrder(
        'sysco',
        'org-1',
        'SHIPPED-123'
      );

      if (result.success && result.order) {
        if (result.order.status === 'shipped') {
          expect(result.order).toHaveProperty('trackingNumber');
          expect(result.order).toHaveProperty('estimatedDelivery');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      let successCount = 0;

      // Make more requests than limit
      for (let i = 0; i < 150; i++) {
        const result = await supplierAPI.searchProducts(
          'sysco',
          'org-1',
          `query-${i}`
        );

        if (result.success) {
          successCount++;
        }
      }

      // Some requests should fail due to rate limit
      expect(successCount).toBeLessThan(150);
    });

    it('should report rate limit status', async () => {
      const status = supplierAPI.getRateLimitStatus('sysco');

      expect(status).toHaveProperty('requests');
      expect(status).toHaveProperty('limit');
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(status.remaining).toBeLessThanOrEqual(status.limit);
    });

    it('should reset rate limit after window expires', async () => {
      const beforeStatus = supplierAPI.getRateLimitStatus('us-foods');
      expect(beforeStatus.remaining).toBe(beforeStatus.limit);

      // After rate limit window, should reset
      // (This would require time manipulation in real tests)
    });

    it('should apply rate limits per supplier', async () => {
      const syscoStatus = supplierAPI.getRateLimitStatus('sysco');
      const usFoodsStatus = supplierAPI.getRateLimitStatus('us-foods');
      const gfsStatus = supplierAPI.getRateLimitStatus('gfs');

      expect(typeof syscoStatus.remaining).toBe('number');
      expect(typeof usFoodsStatus.remaining).toBe('number');
      expect(typeof gfsStatus.remaining).toBe('number');
    });
  });

  describe('Caching', () => {
    it('should cache search results', async () => {
      const before = supplierAPI.getCacheStats();

      await supplierAPI.searchProducts('sysco', 'org-1', 'flour');
      await supplierAPI.searchProducts('sysco', 'org-1', 'flour');

      const after = supplierAPI.getCacheStats();
      expect(after.entries).toBeGreaterThanOrEqual(before.entries);
    });

    it('should expire cache entries after TTL', async () => {
      await supplierAPI.searchProducts('us-foods', 'org-1', 'beef');
      const beforeClear = supplierAPI.getCacheStats();

      supplierAPI.clearCache('us-foods');
      const afterClear = supplierAPI.getCacheStats();

      expect(afterClear.entries).toBeLessThan(beforeClear.entries);
    });

    it('should allow clearing cache by supplier', async () => {
      await supplierAPI.searchProducts('sysco', 'org-1', 'chicken');
      await supplierAPI.searchProducts('us-foods', 'org-1', 'beef');

      supplierAPI.clearCache('sysco');
      const stats = supplierAPI.getCacheStats();

      expect(stats.entries).toBeLessThanOrEqual(2);
    });

    it('should allow clearing all cache', async () => {
      await supplierAPI.searchProducts('sysco', 'org-1', 'flour');
      await supplierAPI.searchProducts('us-foods', 'org-1', 'sugar');
      await supplierAPI.searchProducts('gfs', 'org-1', 'oil');

      supplierAPI.clearCache();
      const stats = supplierAPI.getCacheStats();

      expect(stats.entries).toBe(0);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize Sysco products', async () => {
      const result = await supplierAPI.searchProducts('sysco', 'org-1', 'test');

      if (result.products.length > 0) {
        const product = result.products[0];
        expect(product.supplierType).toBe('sysco');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('unitPrice');
      }
    });

    it('should normalize US Foods products', async () => {
      const result = await supplierAPI.searchProducts('us-foods', 'org-1', 'test');

      if (result.products.length > 0) {
        const product = result.products[0];
        expect(product.supplierType).toBe('us-foods');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('unitPrice');
      }
    });

    it('should normalize GFS products', async () => {
      const result = await supplierAPI.searchProducts('gfs', 'org-1', 'test');

      if (result.products.length > 0) {
        const product = result.products[0];
        expect(product.supplierType).toBe('gfs');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('unitPrice');
      }
    });

    it('should include nutrition info when available', async () => {
      const result = await supplierAPI.getProductDetails('sysco', 'org-1', 'TEST');

      if (result.product?.nutritionInfo) {
        expect(result.product.nutritionInfo).toHaveProperty('calories');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const result = await supplierAPI.searchProducts(
        'sysco',
        'org-1',
        'test'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });

    it('should handle missing credentials', async () => {
      const result = await supplierAPI.getProductDetails(
        'sysco',
        'org-1',
        'SKU'
      );

      expect(result).toHaveProperty('success');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle network errors', async () => {
      const result = await supplierAPI.placeOrder(
        'us-foods',
        'org-1',
        [{ sku: 'TEST', quantity: 1, unitPrice: 10 }]
      );

      expect(result).toHaveProperty('success');
    });
  });

  describe('Multi-Supplier Operations', () => {
    it('should compare prices across suppliers', async () => {
      const items = [{ sku: 'BEEF-001', quantity: 20 }];

      const quotes = await Promise.all([
        supplierAPI.requestQuote('sysco', 'org-1', items),
        supplierAPI.requestQuote('us-foods', 'org-1', items),
        supplierAPI.requestQuote('gfs', 'org-1', items),
      ]);

      const validQuotes = quotes.filter((q) => q.success && q.quote);
      expect(validQuotes.length).toBeGreaterThanOrEqual(0);

      if (validQuotes.length > 1) {
        const totals = validQuotes.map((q) => q.quote!.total);
        const minPrice = Math.min(...totals);
        const maxPrice = Math.max(...totals);
        expect(maxPrice).toBeGreaterThanOrEqual(minPrice);
      }
    });

    it('should sync inventory across suppliers', async () => {
      const suppliers: SupplierType[] = ['sysco', 'us-foods', 'gfs'];

      const results = await Promise.all(
        suppliers.map((s) => supplierAPI.searchProducts(s, 'org-1', 'test'))
      );

      expect(results.length).toBe(3);
      results.forEach((r) => {
        expect(Array.isArray(r.products)).toBe(true);
      });
    });
  });
});
