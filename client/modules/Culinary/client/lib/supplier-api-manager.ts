import { supabase } from './auth-service';

export type SupplierType = 'sysco' | 'us-foods' | 'gfs';

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierType: SupplierType;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  minimumOrder: number;
  packSize: string;
  unit: string;
  image?: string;
  available: boolean;
  lastUpdated: number;
  specSheet?: string;
  allergenInfo?: string;
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    sodium?: number;
  };
}

export interface SupplierQuote {
  id: string;
  supplierId: string;
  supplierType: SupplierType;
  lineItems: Array<{
    productId: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  validUntil: number;
  requestedAt: number;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierType: SupplierType;
  orderNumber: string;
  lineItems: Array<{
    productId: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: number;
  estimatedDelivery?: number;
  actualDelivery?: number;
  trackingNumber?: string;
}

interface RateLimit {
  requests: number;
  resetTime: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SupplierAPIManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 100; // Max requests per minute

  private readonly API_ENDPOINTS = {
    sysco: {
      base: 'https://api.sysco.com/v1',
      products: '/catalog/products',
      quotes: '/orders/quotes',
      orders: '/orders',
    },
    'us-foods': {
      base: 'https://api.usfoods.com/v1',
      products: '/products',
      quotes: '/quotes',
      orders: '/orders',
    },
    gfs: {
      base: 'https://api.gfs.com/v1',
      products: '/products',
      quotes: '/quotes',
      orders: '/orders',
    },
  };

  /**
   * Check rate limit for supplier
   */
  private checkRateLimit(supplier: SupplierType): boolean {
    const key = `ratelimit:${supplier}`;
    const limit = this.rateLimits.get(key);
    const now = Date.now();

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, {
        requests: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (limit.requests < this.RATE_LIMIT_MAX) {
      limit.requests++;
      return true;
    }

    return false;
  }

  /**
   * Get cached data if available
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  private setCachedData<T>(key: string, data: T, ttl = this.CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get API credentials from Supabase
   */
  private async getSupplierCredentials(
    supplier: SupplierType,
    organizationId: string
  ): Promise<{ apiKey: string; apiSecret?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('supplier_credentials')
        .select('api_key, api_secret')
        .eq('supplier_type', supplier)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;

      return {
        apiKey: data.api_key,
        apiSecret: data.api_secret,
      };
    } catch (error) {
      console.error(`Error fetching credentials for ${supplier}:`, error);
      return null;
    }
  }

  /**
   * Search supplier products
   */
  async searchProducts(
    supplier: SupplierType,
    organizationId: string,
    query: string,
    options?: {
      category?: string;
      maxPrice?: number;
      minAvailable?: number;
      limit?: number;
    }
  ): Promise<{ success: boolean; products: SupplierProduct[]; error?: any }> {
    if (!this.checkRateLimit(supplier)) {
      return {
        success: false,
        products: [],
        error: 'Rate limit exceeded',
      };
    }

    const cacheKey = `supplier:${supplier}:search:${query}:${JSON.stringify(options || {})}`;
    const cached = this.getCachedData<SupplierProduct[]>(cacheKey);

    if (cached) {
      return { success: true, products: cached };
    }

    try {
      const credentials = await this.getSupplierCredentials(supplier, organizationId);
      if (!credentials) {
        return {
          success: false,
          products: [],
          error: 'No credentials configured',
        };
      }

      const endpoint = this.API_ENDPOINTS[supplier];
      const params = new URLSearchParams({
        q: query,
        ...(options?.category && { category: options.category }),
        ...(options?.maxPrice && { maxPrice: String(options.maxPrice) }),
        ...(options?.minAvailable && { minAvailable: String(options.minAvailable) }),
        limit: String(options?.limit || 50),
      });

      const response = await fetch(
        `${endpoint.base}${endpoint.products}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          products: [],
          error: `API error: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const products = data.products || data.data || [];

      // Normalize product data across suppliers
      const normalizedProducts = this.normalizeProducts(products, supplier);

      // Cache results
      this.setCachedData(cacheKey, normalizedProducts);

      return { success: true, products: normalizedProducts };
    } catch (error) {
      console.error(`Error searching products from ${supplier}:`, error);
      return {
        success: false,
        products: [],
        error: String(error),
      };
    }
  }

  /**
   * Get product details
   */
  async getProductDetails(
    supplier: SupplierType,
    organizationId: string,
    sku: string
  ): Promise<{ success: boolean; product?: SupplierProduct; error?: any }> {
    if (!this.checkRateLimit(supplier)) {
      return {
        success: false,
        error: 'Rate limit exceeded',
      };
    }

    const cacheKey = `supplier:${supplier}:product:${sku}`;
    const cached = this.getCachedData<SupplierProduct>(cacheKey);

    if (cached) {
      return { success: true, product: cached };
    }

    try {
      const credentials = await this.getSupplierCredentials(supplier, organizationId);
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials configured',
        };
      }

      const endpoint = this.API_ENDPOINTS[supplier];
      const response = await fetch(
        `${endpoint.base}${endpoint.products}/${sku}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const normalized = this.normalizeProduct(data, supplier);

      this.setCachedData(cacheKey, normalized);

      return { success: true, product: normalized };
    } catch (error) {
      console.error(`Error fetching product from ${supplier}:`, error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Request price quote
   */
  async requestQuote(
    supplier: SupplierType,
    organizationId: string,
    items: Array<{ sku: string; quantity: number }>
  ): Promise<{ success: boolean; quote?: SupplierQuote; error?: any }> {
    if (!this.checkRateLimit(supplier)) {
      return {
        success: false,
        error: 'Rate limit exceeded',
      };
    }

    try {
      const credentials = await this.getSupplierCredentials(supplier, organizationId);
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials configured',
        };
      }

      const endpoint = this.API_ENDPOINTS[supplier];
      const response = await fetch(
        `${endpoint.base}${endpoint.quotes}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineItems: items,
            organizationId,
          }),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const quote = this.normalizeQuote(data, supplier);

      // Save quote to database
      await supabase
        .from('supplier_quotes')
        .insert({
          supplier_type: supplier,
          organization_id: organizationId,
          quote_data: quote,
          created_at: new Date().toISOString(),
        });

      return { success: true, quote };
    } catch (error) {
      console.error(`Error requesting quote from ${supplier}:`, error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Place order
   */
  async placeOrder(
    supplier: SupplierType,
    organizationId: string,
    items: Array<{ sku: string; quantity: number; unitPrice: number }>
  ): Promise<{ success: boolean; order?: SupplierOrder; error?: any }> {
    if (!this.checkRateLimit(supplier)) {
      return {
        success: false,
        error: 'Rate limit exceeded',
      };
    }

    try {
      const credentials = await this.getSupplierCredentials(supplier, organizationId);
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials configured',
        };
      }

      const endpoint = this.API_ENDPOINTS[supplier];
      const response = await fetch(
        `${endpoint.base}${endpoint.orders}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineItems: items,
            organizationId,
          }),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const order = this.normalizeOrder(data, supplier);

      // Save order to database
      await supabase
        .from('supplier_orders')
        .insert({
          supplier_type: supplier,
          organization_id: organizationId,
          order_data: order,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      return { success: true, order };
    } catch (error) {
      console.error(`Error placing order with ${supplier}:`, error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Track order status
   */
  async trackOrder(
    supplier: SupplierType,
    organizationId: string,
    orderNumber: string
  ): Promise<{ success: boolean; order?: SupplierOrder; error?: any }> {
    if (!this.checkRateLimit(supplier)) {
      return {
        success: false,
        error: 'Rate limit exceeded',
      };
    }

    const cacheKey = `supplier:${supplier}:order:${orderNumber}`;
    const cached = this.getCachedData<SupplierOrder>(cacheKey);

    if (cached && cached.status !== 'pending') {
      return { success: true, order: cached };
    }

    try {
      const credentials = await this.getSupplierCredentials(supplier, organizationId);
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials configured',
        };
      }

      const endpoint = this.API_ENDPOINTS[supplier];
      const response = await fetch(
        `${endpoint.base}${endpoint.orders}/${orderNumber}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const order = this.normalizeOrder(data, supplier);

      // Cache completed orders longer
      const ttl = ['shipped', 'delivered'].includes(order.status) ? 86400000 : 300000; // 1 day for completed, 5 min for pending
      this.setCachedData(cacheKey, order, ttl);

      return { success: true, order };
    } catch (error) {
      console.error(`Error tracking order from ${supplier}:`, error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Normalize product data from different suppliers
   */
  private normalizeProducts(products: any[], supplier: SupplierType): SupplierProduct[] {
    return products.map((p) => this.normalizeProduct(p, supplier));
  }

  /**
   * Normalize single product
   */
  private normalizeProduct(product: any, supplier: SupplierType): SupplierProduct {
    const now = Date.now();

    switch (supplier) {
      case 'sysco':
        return {
          id: product.productId || product.id,
          supplierId: 'sysco',
          supplierType: supplier,
          sku: product.sku || product.productCode,
          name: product.productName || product.name,
          description: product.description || '',
          category: product.category || product.productClass || '',
          unitPrice: parseFloat(product.unitPrice || product.price || 0),
          minimumOrder: parseInt(product.minimumOrderQty || 1, 10),
          packSize: product.packSize || '1',
          unit: product.unit || 'EA',
          image: product.image || product.imageUrl,
          available: product.available !== false,
          lastUpdated: now,
          specSheet: product.specSheet,
          allergenInfo: product.allergenInfo,
          nutritionInfo: product.nutritionInfo,
        };

      case 'us-foods':
        return {
          id: product.itemId || product.id,
          supplierId: 'us-foods',
          supplierType: supplier,
          sku: product.itemNumber || product.sku,
          name: product.itemDescription || product.name,
          description: product.longDescription || '',
          category: product.category || product.class || '',
          unitPrice: parseFloat(product.unitPrice || product.price || 0),
          minimumOrder: parseInt(product.minimumOrder || 1, 10),
          packSize: product.packSize || '1',
          unit: product.unit || 'EA',
          image: product.imageUrl,
          available: product.itemStatus === 'Active',
          lastUpdated: now,
          specSheet: product.specSheet,
          allergenInfo: product.allergenInfo,
          nutritionInfo: product.nutritionFacts,
        };

      case 'gfs':
        return {
          id: product.productId || product.id,
          supplierId: 'gfs',
          supplierType: supplier,
          sku: product.sku || product.itemNumber,
          name: product.productName || product.name,
          description: product.description || '',
          category: product.category || '',
          unitPrice: parseFloat(product.price || product.unitPrice || 0),
          minimumOrder: parseInt(product.minimumOrder || 1, 10),
          packSize: product.packSize || '1',
          unit: product.unit || 'EA',
          image: product.imageUrl,
          available: product.available === true || product.inStock === true,
          lastUpdated: now,
          specSheet: product.specSheet,
          allergenInfo: product.allergenInfo,
          nutritionInfo: product.nutritionInfo,
        };

      default:
        return {
          id: product.id || '',
          supplierId: supplier,
          supplierType: supplier,
          sku: product.sku || '',
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          unitPrice: 0,
          minimumOrder: 1,
          packSize: '1',
          unit: 'EA',
          available: true,
          lastUpdated: now,
        };
    }
  }

  /**
   * Normalize quote data
   */
  private normalizeQuote(quote: any, supplier: SupplierType): SupplierQuote {
    return {
      id: quote.quoteId || quote.id,
      supplierId: supplier,
      supplierType: supplier,
      lineItems: quote.lineItems || [],
      subtotal: parseFloat(quote.subtotal || 0),
      tax: parseFloat(quote.tax || 0),
      shipping: parseFloat(quote.shipping || 0),
      total: parseFloat(quote.total || 0),
      validUntil: quote.validUntil || Date.now() + 604800000, // 7 days
      requestedAt: Date.now(),
    };
  }

  /**
   * Normalize order data
   */
  private normalizeOrder(order: any, supplier: SupplierType): SupplierOrder {
    return {
      id: order.orderId || order.id,
      supplierId: supplier,
      supplierType: supplier,
      orderNumber: order.orderNumber || order.poNumber || '',
      lineItems: order.lineItems || [],
      total: parseFloat(order.total || 0),
      status: (order.status || 'pending').toLowerCase() as any,
      orderDate: order.orderDate || Date.now(),
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      trackingNumber: order.trackingNumber,
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(supplier: SupplierType) {
    const key = `ratelimit:${supplier}`;
    const limit = this.rateLimits.get(key);

    if (!limit) {
      return {
        requests: 0,
        limit: this.RATE_LIMIT_MAX,
        remaining: this.RATE_LIMIT_MAX,
        resetTime: Date.now() + this.RATE_LIMIT_WINDOW,
      };
    }

    return {
      requests: limit.requests,
      limit: this.RATE_LIMIT_MAX,
      remaining: Math.max(0, this.RATE_LIMIT_MAX - limit.requests),
      resetTime: limit.resetTime,
    };
  }

  /**
   * Clear cache
   */
  clearCache(supplier?: SupplierType) {
    if (supplier) {
      const keysToDelete = Array.from(this.cache.keys()).filter((k) =>
        k.includes(`supplier:${supplier}`)
      );
      keysToDelete.forEach((k) => this.cache.delete(k));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      memory: this.cache.size * 1024, // Rough estimate
    };
  }
}

export const supplierAPI = new SupplierAPIManager();
