/**
 * Unified POS Integration Layer
 * 
 * Centralized service for integrating with all POS systems (Toast, Square, Resy, OpenTable, Lightspeed, etc.)
 * Provides a unified interface for all LUCCCA modules to interact with POS systems.
 * 
 * Features:
 * - Unified adapter pattern for all POS providers
 * - Centralized configuration management
 * - Real-time webhook handling
 * - Transaction sync and reconciliation
 * - Event bus integration for system-wide notifications
 * - Error handling and retry logic
 * - Multi-tenant isolation
 */

import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';
// D4: emit POS_CHECK_CLOSED on the unified bus when a completed transaction
// lands. Chronos and any other live-tile consumer can subscribe to refresh
// instead of polling.
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';

// Make axios optional - POS integration not critical for app startup
let axios: any = null;

try {
  const axiosImport = require('axios');
  axios = axiosImport.default || axiosImport;
} catch (error) {
  logger.warn('axios package not available - POS integration disabled');
  // Provide a mock axios with a create method that returns a no-op client
  axios = {
    create: () => ({
      get: async () => ({ data: {} }),
      post: async () => ({ data: {} }),
      put: async () => ({ data: {} }),
      delete: async () => ({ data: {} }),
    }),
  };
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type POSType = 'toast' | 'square' | 'resy' | 'opentable' | 'lightspeed' | 'margin_edge' | 'other';

export interface POSConfig {
  id: string;
  org_id: string;
  outlet_id?: string;
  pos_type: POSType;
  display_name?: string;
  api_key: string;
  api_secret?: string;
  api_token?: string;
  webhook_url?: string;
  webhook_secret?: string;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  last_sync_at?: Date;
  active: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface POSTransaction {
  id: string;
  pos_transaction_id: string;
  org_id: string;
  outlet_id: string;
  check_id?: string;
  check_number?: string;
  table_number?: string;
  server_name?: string;
  items: POSTransactionItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'refunded' | 'voided';
  transaction_date: Date;
  pos_type: POSType;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface POSTransactionItem {
  id: string;
  pos_item_id: string;
  item_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  metadata?: Record<string, any>;
}

export interface POSMenu {
  id: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  sku?: string;
  available: boolean;
  modifiers?: Array<{
    id: string;
    name: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  metadata?: Record<string, any>;
}

export interface POSSyncResult {
  success: boolean;
  transactions_synced: number;
  transactions_failed: number;
  start_date: Date;
  end_date: Date;
  duration_ms: number;
  errors?: Array<{
    transaction_id: string;
    error: string;
  }>;
}

export interface POSAdapter {
  /**
   * Test connection to POS system
   */
  testConnection(config: POSConfig): Promise<boolean>;

  /**
   * Pull transactions from POS system
   */
  pullTransactions(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<POSTransaction[]>;

  /**
   * Pull menu items from POS system
   */
  pullMenu(config: POSConfig): Promise<POSMenu[]>;

  /**
   * Push menu items to POS system
   */
  pushMenu(config: POSConfig, menuItems: POSMenu[]): Promise<boolean>;

  /**
   * Handle webhook from POS system
   */
  handleWebhook(
    config: POSConfig,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null>;

  /**
   * Get sales report data
   */
  getSalesReport(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<{
    revenue: number;
    transactions: number;
    covers?: number;
    tips: number;
    date: string;
  }[]>;
}

// ============================================================================
// POS ADAPTERS
// ============================================================================

/**
 * Toast POS Adapter
 */
class ToastAdapter implements POSAdapter {
  private baseUrl = 'https://ws.toasttab.com';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection(config: POSConfig): Promise<boolean> {
    try {
      const response = await this.client.get('/restaurants', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      logger.error('[ToastAdapter] Connection test failed', { error, org_id: config.org_id });
      return false;
    }
  }

  async pullTransactions(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<POSTransaction[]> {
    try {
      const response = await this.client.get('/transactions', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const transactions: POSTransaction[] = (response.data.transactions || []).map((tx: any) => ({
        id: tx.id || `toast_${tx.guid}`,
        pos_transaction_id: tx.guid || tx.id,
        org_id: config.org_id,
        outlet_id: config.outlet_id || tx.restaurantGuid,
        check_id: tx.checkGuid,
        check_number: tx.checkNumber,
        table_number: tx.tableName,
        server_name: tx.serverName,
        items: (tx.items || []).map((item: any) => ({
          id: item.guid || `item_${item.id}`,
          pos_item_id: item.menuItemGuid || item.id,
          item_name: item.name,
          sku: item.sku,
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          modifiers: item.modifiers?.map((m: any) => ({
            name: m.name,
            price: m.price || 0,
          })),
        })),
        subtotal: tx.subtotal || 0,
        tax: tx.tax || 0,
        tip: tx.tip || 0,
        total: tx.total || tx.amount || 0,
        payment_method: tx.paymentMethod,
        payment_status: this.mapPaymentStatus(tx.status),
        transaction_date: new Date(tx.dateTime || tx.createdDate),
        pos_type: 'toast',
        metadata: {
          restaurantGuid: tx.restaurantGuid,
          employeeGuid: tx.employeeGuid,
          diningOption: tx.diningOption,
        },
        created_at: new Date(),
      }));

      return transactions;
    } catch (error) {
      logger.error('[ToastAdapter] Failed to pull transactions', {
        error,
        org_id: config.org_id,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  async pullMenu(config: POSConfig): Promise<POSMenu[]> {
    try {
      const response = await this.client.get('/menus', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });

      const menuItems: POSMenu[] = [];
      const menus = response.data.menus || [];

      for (const menu of menus) {
        const categories = menu.categories || [];
        for (const category of categories) {
          const items = category.items || [];
          for (const item of items) {
            menuItems.push({
              id: item.guid || `menu_${item.id}`,
              name: item.name,
              category: category.name,
              description: item.description,
              price: item.price || 0,
              sku: item.sku,
              available: item.available !== false,
              modifiers: item.modifiers?.map((m: any) => ({
                id: m.guid || `mod_${m.id}`,
                name: m.name,
                options: (m.options || []).map((opt: any) => ({
                  id: opt.guid || `opt_${opt.id}`,
                  name: opt.name,
                  price: opt.price || 0,
                })),
              })),
              metadata: {
                menuGuid: menu.guid,
                categoryGuid: category.guid,
              },
            });
          }
        }
      }

      return menuItems;
    } catch (error) {
      logger.error('[ToastAdapter] Failed to pull menu', { error, org_id: config.org_id });
      throw error;
    }
  }

  async pushMenu(config: POSConfig, menuItems: POSMenu[]): Promise<boolean> {
    // Toast API menu push implementation
    // This would transform LUCCCA menu items to Toast format and push
    logger.info('[ToastAdapter] Push menu not yet implemented', { org_id: config.org_id });
    return false;
  }

  async handleWebhook(
    config: POSConfig,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null> {
    // Verify webhook signature
    if (signature && config.webhook_secret) {
      // Implement signature verification
      // const isValid = verifyToastWebhook(payload, signature, config.webhook_secret);
      // if (!isValid) throw new Error('Invalid webhook signature');
    }

    // Handle different webhook event types
    const eventType = payload.eventType || payload.type;
    
    if (eventType === 'CHECK_CLOSED' || eventType === 'TRANSACTION_COMPLETE') {
      // Transform webhook payload to POSTransaction
      const transaction = await this.pullTransactions(
        config,
        new Date(payload.timestamp || Date.now()),
        new Date(payload.timestamp || Date.now())
      );
      return transaction[0] || null;
    }

    return null;
  }

  async getSalesReport(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ revenue: number; transactions: number; covers?: number; tips: number; date: string }>> {
    try {
      const response = await this.client.get('/reports/netSales', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      return (response.data.items || []).map((item: any) => ({
        revenue: item.netSales || 0,
        transactions: item.transactionCount || 0,
        covers: item.covers,
        tips: item.creditTips || 0,
        date: item.businessDate,
      }));
    } catch (error) {
      logger.error('[ToastAdapter] Failed to get sales report', { error, org_id: config.org_id });
      throw error;
    }
  }

  private mapPaymentStatus(status: string): 'pending' | 'completed' | 'refunded' | 'voided' {
    const statusMap: Record<string, 'pending' | 'completed' | 'refunded' | 'voided'> = {
      'OPEN': 'pending',
      'CLOSED': 'completed',
      'VOIDED': 'voided',
      'REFUNDED': 'refunded',
      'COMPLETED': 'completed',
    };
    return statusMap[status?.toUpperCase()] || 'completed';
  }
}

/**
 * Square POS Adapter
 */
class SquareAdapter implements POSAdapter {
  private baseUrl = 'https://connect.squareup.com/v2';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
    });
  }

  async testConnection(config: POSConfig): Promise<boolean> {
    try {
      const response = await this.client.get('/locations', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });
      return response.status === 200 && response.data.locations?.length > 0;
    } catch (error) {
      logger.error('[SquareAdapter] Connection test failed', { error, org_id: config.org_id });
      return false;
    }
  }

  async pullTransactions(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<POSTransaction[]> {
    try {
      const locationId = config.metadata?.location_id || config.outlet_id;
      if (!locationId) {
        throw new Error('Square location_id required');
      }

      const response = await this.client.post('/orders/search', {
        location_ids: [locationId],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString(),
              },
            },
            state_filter: {
              states: ['COMPLETED'],
            },
          },
        },
      }, {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });

      const transactions: POSTransaction[] = (response.data.orders || []).map((order: any) => ({
        id: order.id,
        pos_transaction_id: order.id,
        org_id: config.org_id,
        outlet_id: locationId,
        check_id: order.id,
        check_number: order.reference_id,
        table_number: order.tenders?.[0]?.note,
        server_name: order.metadata?.server_name,
        items: (order.line_items || []).map((item: any) => ({
          id: item.uid || item.catalog_object_id,
          pos_item_id: item.catalog_object_id,
          item_name: item.name,
          sku: item.catalog_object_id,
          quantity: parseFloat(item.quantity || '1'),
          unit_price: (item.base_price_money?.amount || 0) / 100,
          total_price: (item.total_money?.amount || 0) / 100,
          modifiers: item.modifiers?.map((m: any) => ({
            name: m.name,
            price: (m.total_price_money?.amount || 0) / 100,
          })),
        })),
        subtotal: (order.net_amounts?.total_money?.amount || 0) / 100,
        tax: (order.net_amounts?.tax_money?.amount || 0) / 100,
        tip: (order.net_amounts?.tip_money?.amount || 0) / 100,
        total: (order.net_amounts?.total_money?.amount || 0) / 100,
        payment_method: order.tenders?.[0]?.type,
        payment_status: 'completed',
        transaction_date: new Date(order.created_at),
        pos_type: 'square',
        metadata: {
          location_id: locationId,
          version: order.version,
        },
        created_at: new Date(),
      }));

      return transactions;
    } catch (error) {
      logger.error('[SquareAdapter] Failed to pull transactions', {
        error,
        org_id: config.org_id,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  async pullMenu(config: POSConfig): Promise<POSMenu[]> {
    try {
      const locationId = config.metadata?.location_id || config.outlet_id;
      if (!locationId) {
        throw new Error('Square location_id required');
      }

      const response = await this.client.post('/catalog/search', {
        object_types: ['ITEM'],
      }, {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });

      const menuItems: POSMenu[] = (response.data.objects || []).map((item: any) => ({
        id: item.id,
        name: item.item_data?.name || '',
        category: item.item_data?.category_id,
        description: item.item_data?.description,
        price: item.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount
          ? (item.item_data.variations[0].item_variation_data.price_money.amount / 100)
          : 0,
        sku: item.item_data?.variations?.[0]?.item_variation_data?.sku,
        available: item.item_data?.variations?.[0]?.item_variation_data?.track_inventory !== false,
        metadata: {
          catalog_object_id: item.id,
          version: item.version,
        },
      }));

      return menuItems;
    } catch (error) {
      logger.error('[SquareAdapter] Failed to pull menu', { error, org_id: config.org_id });
      throw error;
    }
  }

  async pushMenu(config: POSConfig, menuItems: POSMenu[]): Promise<boolean> {
    logger.info('[SquareAdapter] Push menu not yet implemented', { org_id: config.org_id });
    return false;
  }

  async handleWebhook(
    config: POSConfig,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null> {
    if (signature && config.webhook_secret) {
      // Implement Square webhook signature verification
    }

    const eventType = payload.type;
    if (eventType === 'order.updated' || eventType === 'payment.updated') {
      const locationId = payload.data?.object?.order_updated?.location_id;
      if (locationId) {
        const transactions = await this.pullTransactions(
          config,
          new Date(payload.created_at || Date.now()),
          new Date(payload.created_at || Date.now())
        );
        return transactions[0] || null;
      }
    }

    return null;
  }

  async getSalesReport(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ revenue: number; transactions: number; covers?: number; tips: number; date: string }>> {
    try {
      const locationId = config.metadata?.location_id || config.outlet_id;
      if (!locationId) {
        throw new Error('Square location_id required');
      }

      const payments = await this.client.get('/payments', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
        params: {
          begin_time: startDate.toISOString().replace(/[^0-9]/g, '').slice(0, 15),
          end_time: endDate.toISOString().replace(/[^0-9]/g, '').slice(0, 15),
          location_id: locationId,
        },
      });

      const paymentsByDate = new Map<string, { revenue: number; transactions: number; tips: number }>();

      (payments.data.payments || []).forEach((payment: any) => {
        const date = payment.created_at.slice(0, 10);
        if (!paymentsByDate.has(date)) {
          paymentsByDate.set(date, { revenue: 0, transactions: 0, tips: 0 });
        }
        const entry = paymentsByDate.get(date)!;
        entry.revenue += (payment.amount_money?.amount || 0) / 100;
        entry.tips += (payment.tip_money?.amount || 0) / 100;
        entry.transactions += 1;
      });

      return Array.from(paymentsByDate.entries()).map(([date, data]) => ({
        revenue: data.revenue,
        transactions: data.transactions,
        tips: data.tips,
        date,
      }));
    } catch (error) {
      logger.error('[SquareAdapter] Failed to get sales report', { error, org_id: config.org_id });
      throw error;
    }
  }
}

/**
 * Resy Adapter
 * Note: Resy is primarily a reservation system, not a traditional POS.
 * This adapter focuses on reservation-based revenue and events.
 */
class ResyAdapter implements POSAdapter {
  private baseUrl = 'https://api.resy.com';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'ResyAPI api_key', // Will be replaced per request
      },
    });
  }

  async testConnection(config: POSConfig): Promise<boolean> {
    try {
      // Resy API connection test (adjust endpoint based on actual API)
      const response = await this.client.get('/venues', {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });
      return response.status === 200 && response.data.venues?.length > 0;
    } catch (error) {
      logger.error('[ResyAdapter] Connection test failed', { error, org_id: config.org_id });
      return false;
    }
  }

  async pullTransactions(config: POSConfig, startDate: Date, endDate: Date): Promise<POSTransaction[]> {
    try {
      const venueId = config.metadata?.venue_id || config.outlet_id;
      if (!venueId) {
        throw new Error('Resy venue_id required');
      }

      // Resy reservations can be treated as transactions
      // Note: Adjust endpoint based on actual Resy API documentation
      const response = await this.client.get(`/venues/${venueId}/reservations`, {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
        params: {
          date_start: startDate.toISOString().split('T')[0],
          date_end: endDate.toISOString().split('T')[0],
        },
      });

      const reservations = response.data.reservations || [];
      const transactions: POSTransaction[] = reservations.map((res: any) => ({
        id: res.resy_token || `resy_${res.id}`,
        pos_transaction_id: res.resy_token || res.id,
        org_id: config.org_id,
        outlet_id: venueId,
        check_id: res.resy_token,
        check_number: res.confirmation_number,
        table_number: res.table_number,
        server_name: res.server_name,
        items: [{
          id: res.id,
          pos_item_id: res.id,
          item_name: `Reservation - ${res.covers} covers`,
          quantity: res.covers || 1,
          unit_price: res.deposit_amount || 0,
          total_price: res.deposit_amount || res.revenue || 0,
        }],
        subtotal: res.revenue || res.deposit_amount || 0,
        tax: 0,
        tip: res.gratuity || 0,
        total: res.revenue || res.deposit_amount || 0,
        payment_method: res.payment_method,
        payment_status: this.mapPaymentStatus(res.status),
        transaction_date: new Date(res.date_time || res.created_at),
        pos_type: 'resy',
        metadata: {
          venue_id: venueId,
          reservation_token: res.resy_token,
          covers: res.covers,
        },
        created_at: new Date(),
      }));

      return transactions;
    } catch (error) {
      logger.error('[ResyAdapter] Failed to pull transactions', {
        error,
        org_id: config.org_id,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  async pullMenu(config: POSConfig): Promise<POSMenu[]> {
    try {
      const venueId = config.metadata?.venue_id || config.outlet_id;
      if (!venueId) {
        throw new Error('Resy venue_id required');
      }

      // Resy may not have traditional menu items
      // This would pull venue information, pricing tiers, etc.
      logger.warn('[ResyAdapter] Menu pull not applicable for reservation system', {
        org_id: config.org_id,
      });
      return [];
    } catch (error) {
      logger.error('[ResyAdapter] Failed to pull menu', { error, org_id: config.org_id });
      throw error;
    }
  }

  async pushMenu(config: POSConfig, menuItems: POSMenu[]): Promise<boolean> {
    logger.info('[ResyAdapter] Push menu not applicable for reservation system', {
      org_id: config.org_id,
    });
    return false;
  }

  async handleWebhook(
    config: POSConfig,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null> {
    if (signature && config.webhook_secret) {
      // Implement Resy webhook signature verification when API docs available
    }

    const eventType = payload.type || payload.event_type;
    if (eventType === 'reservation.created' || eventType === 'reservation.confirmed') {
      // Transform reservation webhook to transaction
      const transaction: POSTransaction = {
        id: payload.resy_token || `resy_${payload.id}`,
        pos_transaction_id: payload.resy_token || payload.id,
        org_id: config.org_id,
        outlet_id: config.metadata?.venue_id || config.outlet_id || '',
        check_id: payload.resy_token,
        check_number: payload.confirmation_number,
        items: [{
          id: payload.id,
          pos_item_id: payload.id,
          item_name: `Reservation - ${payload.covers || 1} covers`,
          quantity: payload.covers || 1,
          unit_price: payload.deposit_amount || 0,
          total_price: payload.deposit_amount || payload.revenue || 0,
        }],
        subtotal: payload.revenue || payload.deposit_amount || 0,
        tax: 0,
        tip: payload.gratuity || 0,
        total: payload.revenue || payload.deposit_amount || 0,
        payment_method: payload.payment_method,
        payment_status: this.mapPaymentStatus(payload.status),
        transaction_date: new Date(payload.date_time || payload.created_at || Date.now()),
        pos_type: 'resy',
        metadata: {
          reservation_token: payload.resy_token,
          covers: payload.covers,
        },
        created_at: new Date(),
      };

      return transaction;
    }

    return null;
  }

  async getSalesReport(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ revenue: number; transactions: number; covers?: number; tips: number; date: string }>> {
    try {
      const venueId = config.metadata?.venue_id || config.outlet_id;
      if (!venueId) {
        throw new Error('Resy venue_id required');
      }

      const transactions = await this.pullTransactions(config, startDate, endDate);
      const reportByDate = new Map<string, { revenue: number; transactions: number; covers: number; tips: number }>();

      transactions.forEach((tx) => {
        const date = tx.transaction_date.toISOString().split('T')[0];
        if (!reportByDate.has(date)) {
          reportByDate.set(date, { revenue: 0, transactions: 0, covers: 0, tips: 0 });
        }
        const entry = reportByDate.get(date)!;
        entry.revenue += tx.total;
        entry.tips += tx.tip;
        entry.transactions += 1;
        entry.covers += tx.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      return Array.from(reportByDate.entries()).map(([date, data]) => ({
        revenue: data.revenue,
        transactions: data.transactions,
        covers: data.covers,
        tips: data.tips,
        date,
      }));
    } catch (error) {
      logger.error('[ResyAdapter] Failed to get sales report', { error, org_id: config.org_id });
      throw error;
    }
  }

  private mapPaymentStatus(status: string): 'pending' | 'completed' | 'refunded' | 'voided' {
    const statusMap: Record<string, 'pending' | 'completed' | 'refunded' | 'voided'> = {
      'PENDING': 'pending',
      'CONFIRMED': 'completed',
      'SEATED': 'completed',
      'COMPLETED': 'completed',
      'CANCELLED': 'voided',
      'REFUNDED': 'refunded',
      'NO_SHOW': 'voided',
    };
    return statusMap[status?.toUpperCase() || ''] || 'completed';
  }
}

/**
 * OpenTable Adapter
 * Note: OpenTable is primarily a reservation system, similar to Resy.
 * This adapter handles reservation-based revenue and events.
 */
class OpenTableAdapter implements POSAdapter {
  private baseUrl = 'https://api.opentable.com';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection(config: POSConfig): Promise<boolean> {
    try {
      const restaurantId = config.metadata?.restaurant_id || config.outlet_id;
      if (!restaurantId) {
        throw new Error('OpenTable restaurant_id required');
      }

      // OpenTable API connection test (adjust endpoint based on actual API)
      const response = await this.client.get(`/restaurants/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      logger.error('[OpenTableAdapter] Connection test failed', { error, org_id: config.org_id });
      return false;
    }
  }

  async pullTransactions(config: POSConfig, startDate: Date, endDate: Date): Promise<POSTransaction[]> {
    try {
      const restaurantId = config.metadata?.restaurant_id || config.outlet_id;
      if (!restaurantId) {
        throw new Error('OpenTable restaurant_id required');
      }

      // OpenTable reservations (adjust endpoint based on actual API)
      const response = await this.client.get(`/restaurants/${restaurantId}/reservations`, {
        headers: {
          Authorization: `Bearer ${config.api_token || config.api_key}`,
        },
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });

      const reservations = response.data.reservations || [];
      const transactions: POSTransaction[] = reservations.map((res: any) => ({
        id: res.confirmation_number || `opentable_${res.id}`,
        pos_transaction_id: res.confirmation_number || res.id,
        org_id: config.org_id,
        outlet_id: restaurantId,
        check_id: res.confirmation_number,
        check_number: res.confirmation_number,
        table_number: res.table_number,
        server_name: res.server_name,
        items: [{
          id: res.id,
          pos_item_id: res.id,
          item_name: `Reservation - ${res.party_size || 1} guests`,
          quantity: res.party_size || 1,
          unit_price: res.deposit || res.revenue || 0,
          total_price: res.deposit || res.revenue || 0,
        }],
        subtotal: res.revenue || res.deposit || 0,
        tax: 0,
        tip: res.gratuity || 0,
        total: res.revenue || res.deposit || 0,
        payment_method: res.payment_method,
        payment_status: this.mapPaymentStatus(res.status),
        transaction_date: new Date(res.date_time || res.created_at),
        pos_type: 'opentable',
        metadata: {
          restaurant_id: restaurantId,
          confirmation_number: res.confirmation_number,
          party_size: res.party_size,
        },
        created_at: new Date(),
      }));

      return transactions;
    } catch (error) {
      logger.error('[OpenTableAdapter] Failed to pull transactions', {
        error,
        org_id: config.org_id,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  async pullMenu(config: POSConfig): Promise<POSMenu[]> {
    try {
      const restaurantId = config.metadata?.restaurant_id || config.outlet_id;
      if (!restaurantId) {
        throw new Error('OpenTable restaurant_id required');
      }

      // OpenTable may have menu information in restaurant profile
      // Note: Adjust based on actual OpenTable API
      logger.warn('[OpenTableAdapter] Menu pull limited for reservation system', {
        org_id: config.org_id,
      });
      return [];
    } catch (error) {
      logger.error('[OpenTableAdapter] Failed to pull menu', { error, org_id: config.org_id });
      throw error;
    }
  }

  async pushMenu(config: POSConfig, menuItems: POSMenu[]): Promise<boolean> {
    logger.info('[OpenTableAdapter] Push menu not applicable for reservation system', {
      org_id: config.org_id,
    });
    return false;
  }

  async handleWebhook(
    config: POSConfig,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null> {
    if (signature && config.webhook_secret) {
      // Implement OpenTable webhook signature verification when API docs available
    }

    const eventType = payload.type || payload.event_type;
    if (eventType === 'reservation.created' || eventType === 'reservation.confirmed' || eventType === 'reservation.completed') {
      // Transform reservation webhook to transaction
      const transaction: POSTransaction = {
        id: payload.confirmation_number || `opentable_${payload.id}`,
        pos_transaction_id: payload.confirmation_number || payload.id,
        org_id: config.org_id,
        outlet_id: config.metadata?.restaurant_id || config.outlet_id || '',
        check_id: payload.confirmation_number,
        check_number: payload.confirmation_number,
        items: [{
          id: payload.id,
          pos_item_id: payload.id,
          item_name: `Reservation - ${payload.party_size || 1} guests`,
          quantity: payload.party_size || 1,
          unit_price: payload.deposit || 0,
          total_price: payload.deposit || payload.revenue || 0,
        }],
        subtotal: payload.revenue || payload.deposit || 0,
        tax: 0,
        tip: payload.gratuity || 0,
        total: payload.revenue || payload.deposit || 0,
        payment_method: payload.payment_method,
        payment_status: this.mapPaymentStatus(payload.status),
        transaction_date: new Date(payload.date_time || payload.created_at || Date.now()),
        pos_type: 'opentable',
        metadata: {
          confirmation_number: payload.confirmation_number,
          party_size: payload.party_size,
        },
        created_at: new Date(),
      };

      return transaction;
    }

    return null;
  }

  async getSalesReport(
    config: POSConfig,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ revenue: number; transactions: number; covers?: number; tips: number; date: string }>> {
    try {
      const restaurantId = config.metadata?.restaurant_id || config.outlet_id;
      if (!restaurantId) {
        throw new Error('OpenTable restaurant_id required');
      }

      const transactions = await this.pullTransactions(config, startDate, endDate);
      const reportByDate = new Map<string, { revenue: number; transactions: number; covers: number; tips: number }>();

      transactions.forEach((tx) => {
        const date = tx.transaction_date.toISOString().split('T')[0];
        if (!reportByDate.has(date)) {
          reportByDate.set(date, { revenue: 0, transactions: 0, covers: 0, tips: 0 });
        }
        const entry = reportByDate.get(date)!;
        entry.revenue += tx.total;
        entry.tips += tx.tip;
        entry.transactions += 1;
        entry.covers += tx.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      return Array.from(reportByDate.entries()).map(([date, data]) => ({
        revenue: data.revenue,
        transactions: data.transactions,
        covers: data.covers,
        tips: data.tips,
        date,
      }));
    } catch (error) {
      logger.error('[OpenTableAdapter] Failed to get sales report', { error, org_id: config.org_id });
      throw error;
    }
  }

  private mapPaymentStatus(status: string): 'pending' | 'completed' | 'refunded' | 'voided' {
    const statusMap: Record<string, 'pending' | 'completed' | 'refunded' | 'voided'> = {
      'PENDING': 'pending',
      'CONFIRMED': 'completed',
      'SEATED': 'completed',
      'COMPLETED': 'completed',
      'CANCELLED': 'voided',
      'REFUNDED': 'refunded',
      'NO_SHOW': 'voided',
    };
    return statusMap[status?.toUpperCase() || ''] || 'completed';
  }
}

// ============================================================================
// UNIFIED POS INTEGRATION SERVICE
// ============================================================================

export class POSIntegrationService {
  private adapters: Map<POSType, POSAdapter>;

  constructor() {
    this.adapters = new Map([
      ['toast', new ToastAdapter()],
      ['square', new SquareAdapter()],
      ['resy', new ResyAdapter()],
      ['opentable', new OpenTableAdapter()],
      // Add more adapters as needed
    ]);
  }

  /**
   * Get adapter for POS type
   */
  private getAdapter(posType: POSType): POSAdapter {
    const adapter = this.adapters.get(posType);
    if (!adapter) {
      throw new Error(`Unsupported POS type: ${posType}`);
    }
    return adapter;
  }

  /**
   * Create or update POS configuration
   */
  async saveConfig(config: Omit<POSConfig, 'id' | 'created_at' | 'updated_at'>): Promise<POSConfig> {
    const { data, error } = await supabase
      .from('pos_configs')
      .upsert({
        org_id: config.org_id,
        outlet_id: config.outlet_id,
        pos_type: config.pos_type,
        display_name: config.display_name,
        api_key: config.api_key, // Should be encrypted in production
        api_secret: config.api_secret, // Should be encrypted in production
        api_token: config.api_token, // Should be encrypted in production
        webhook_url: config.webhook_url,
        webhook_secret: config.webhook_secret, // Should be encrypted in production
        sync_enabled: config.sync_enabled,
        sync_frequency_minutes: config.sync_frequency_minutes,
        active: config.active,
        metadata: config.metadata || {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id,outlet_id,pos_type',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('[POSIntegrationService] Failed to save config', { error, org_id: config.org_id });
      throw error;
    }

    logger.info('[POSIntegrationService] Config saved', { org_id: config.org_id, pos_type: config.pos_type });
    return this.mapConfigFromDB(data);
  }

  /**
   * Get POS configuration
   */
  async getConfig(orgId: string, outletId?: string, posType?: POSType): Promise<POSConfig | null> {
    let query = supabase
      .from('pos_configs')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    if (posType) {
      query = query.eq('pos_type', posType);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (error) {
      logger.error('[POSIntegrationService] Failed to get config', { error, org_id: orgId });
      throw error;
    }

    return data ? this.mapConfigFromDB(data) : null;
  }

  /**
   * Test connection to POS system
   */
  async testConnection(orgId: string, outletId?: string, posType?: POSType): Promise<boolean> {
    const config = await this.getConfig(orgId, outletId, posType);
    if (!config) {
      throw new Error('POS configuration not found');
    }

    const adapter = this.getAdapter(config.pos_type);
    return await adapter.testConnection(config);
  }

  /**
   * Sync transactions from POS system
   */
  async syncTransactions(
    orgId: string,
    outletId?: string,
    posType?: POSType,
    startDate?: Date,
    endDate?: Date
  ): Promise<POSSyncResult> {
    const config = await this.getConfig(orgId, outletId, posType);
    if (!config) {
      throw new Error('POS configuration not found');
    }

    if (!config.sync_enabled) {
      throw new Error('POS sync is disabled for this configuration');
    }

    const adapter = this.getAdapter(config.pos_type);
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    const end = endDate || new Date();
    
    const startTime = Date.now();

    try {
      const transactions = await adapter.pullTransactions(config, start, end);
      let synced = 0;
      let failed = 0;
      const errors: Array<{ transaction_id: string; error: string }> = [];

      for (const transaction of transactions) {
        try {
          await this.storeTransaction(transaction);
          synced++;
        } catch (error: any) {
          failed++;
          errors.push({
            transaction_id: transaction.pos_transaction_id,
            error: error.message || 'Unknown error',
          });
          logger.error('[POSIntegrationService] Failed to store transaction', {
            error,
            transaction_id: transaction.pos_transaction_id,
            org_id: orgId,
          });
        }
      }

      // Update last sync time
      await supabase
        .from('pos_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', config.id);

      // Emit event for system-wide notification
      await this.emitSyncEvent(orgId, outletId, {
        success: true,
        transactions_synced: synced,
        transactions_failed: failed,
        start_date: start,
        end_date: end,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      });

      const result: POSSyncResult = {
        success: true,
        transactions_synced: synced,
        transactions_failed: failed,
        start_date: start,
        end_date: end,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      };

      logger.info('[POSIntegrationService] Sync completed', {
        org_id: orgId,
        result,
      });

      return result;
    } catch (error) {
      logger.error('[POSIntegrationService] Sync failed', { error, org_id: orgId });
      
      // Emit failure event
      await this.emitSyncEvent(orgId, outletId, {
        success: false,
        transactions_synced: 0,
        transactions_failed: 0,
        start_date: start,
        end_date: end,
        duration_ms: Date.now() - startTime,
        errors: [{ transaction_id: 'sync', error: (error as Error).message }],
      });

      throw error;
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(transaction: POSTransaction): Promise<void> {
    const { error } = await supabase
      .from('pos_transactions')
      .upsert({
        id: transaction.id,
        pos_transaction_id: transaction.pos_transaction_id,
        org_id: transaction.org_id,
        outlet_id: transaction.outlet_id,
        check_id: transaction.check_id,
        check_number: transaction.check_number,
        table_number: transaction.table_number,
        server_name: transaction.server_name,
        items: transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        tip: transaction.tip,
        total: transaction.total,
        payment_method: transaction.payment_method,
        payment_status: transaction.payment_status,
        transaction_date: transaction.transaction_date.toISOString(),
        pos_type: transaction.pos_type,
        metadata: transaction.metadata || {},
        created_at: transaction.created_at.toISOString(),
      }, {
        onConflict: 'pos_transaction_id,org_id,outlet_id',
        ignoreDuplicates: false,
      });

    if (error) {
      throw error;
    }

    // D4 — emit unified-bus event for completed checks so Chronos and any
    // dashboard listener can refresh live tiles. Skipped for non-completed
    // statuses (pending/refunded/voided fire different events).
    if (transaction.payment_status === 'completed') {
      try {
        await unifiedEventBus.publish(
          UNIFIED_EVENT_TYPES.POS_CHECK_CLOSED,
          {
            transactionId: transaction.id,
            posTransactionId: transaction.pos_transaction_id,
            checkId: transaction.check_id,
            checkNumber: transaction.check_number,
            outletId: transaction.outlet_id,
            orgId: transaction.org_id,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            tip: transaction.tip,
            total: transaction.total,
            paymentMethod: transaction.payment_method,
            itemCount: Array.isArray(transaction.items) ? transaction.items.length : 0,
            transactionDate: transaction.transaction_date?.toISOString?.() ?? null,
            posType: transaction.pos_type,
          },
          {
            source: { bus: 'unified', module: 'pos_integration_layer' },
            tenantId: transaction.org_id,
            outletId: transaction.outlet_id,
          },
        );
      } catch (busErr) {
        logger.warn('[POSIntegration] unified-bus POS_CHECK_CLOSED emit failed', {
          transactionId: transaction.id,
          error: busErr instanceof Error ? busErr.message : String(busErr),
        });
        // Non-blocking: GL posting + EchoStratus ingestion still proceed.
      }
    }

    // Emit transaction event for EchoStratus and other modules
    try {
      const { getPOSEventIngestionService } = await import("./echostratus/pos-event-ingestion");
      const posIngestion = getPOSEventIngestionService();
      await posIngestion.ingestPOSEvent({
        eventId: transaction.id,
        eventType: "transaction",
        timestamp: transaction.timestamp,
        organizationId: transaction.organizationId,
        outletId: transaction.outletId,
        data: transaction,
      });
    } catch (error) {
      logger.error("Failed to ingest POS event to EchoStratus", { error });
    }

    // Post transaction to EchoAurum GL
    try {
      const { postPOSTransactionToGL } = await import("./pos-to-gl-integration");
      await postPOSTransactionToGL({
        id: transaction.id,
        organizationId: transaction.organizationId,
        outletId: transaction.outletId,
        total: transaction.total,
        tax: transaction.tax || 0,
        tip: transaction.tip || 0,
        transactionDate: new Date(transaction.timestamp),
        paymentMethod: transaction.payment_method || "credit_card",
        items: transaction.items || [],
      });
    } catch (error) {
      logger.error("Failed to post POS transaction to GL", { error });
    }
    await this.emitTransactionEvent(transaction);
  }

  /**
   * Handle webhook from POS system
   */
  async handleWebhook(
    orgId: string,
    posType: POSType,
    payload: Record<string, any>,
    signature?: string
  ): Promise<POSTransaction | null> {
    const config = await this.getConfig(orgId, undefined, posType);
    if (!config) {
      throw new Error(`POS configuration not found for ${posType}`);
    }

    const adapter = this.getAdapter(posType);
    const transaction = await adapter.handleWebhook(config, payload, signature);

    if (transaction) {
      await this.storeTransaction(transaction);
    }

    return transaction;
  }

  /**
   * Pull menu from POS system
   */
  async pullMenu(orgId: string, outletId?: string, posType?: POSType): Promise<POSMenu[]> {
    const config = await this.getConfig(orgId, outletId, posType);
    if (!config) {
      throw new Error('POS configuration not found');
    }

    const adapter = this.getAdapter(config.pos_type);
    return await adapter.pullMenu(config);
  }

  /**
   * Get sales report
   */
  async getSalesReport(
    orgId: string,
    outletId?: string,
    posType?: POSType,
    startDate?: Date,
    endDate?: Date
  ) {
    const config = await this.getConfig(orgId, outletId, posType);
    if (!config) {
      throw new Error('POS configuration not found');
    }

    const adapter = this.getAdapter(config.pos_type);
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    return await adapter.getSalesReport(config, start, end);
  }

  /**
   * Emit transaction event to event bus
   */
  private async emitTransactionEvent(transaction: POSTransaction): Promise<void> {
    try {
      const { emitPOSItemOrdered, emitPOSCheckClosed } = await import('../lib/module-event-emitters.js');

      // Emit individual item events
      for (const item of transaction.items) {
        await emitPOSItemOrdered({
          tenant_id: transaction.org_id,
          outlet_id: transaction.outlet_id,
          check_id: transaction.check_id || transaction.id,
          item_id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price,
          ordered_at: transaction.transaction_date.toISOString(),
        });
      }

      // Emit check closed event
      await emitPOSCheckClosed({
        tenant_id: transaction.org_id,
        outlet_id: transaction.outlet_id,
        check_id: transaction.check_id || transaction.id,
        check_number: transaction.check_number,
        total_amount: transaction.total,
        items: transaction.items.map(item => ({
          id: item.id,
          name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price,
        })),
        table_number: transaction.table_number,
        payment_method: transaction.payment_method,
        closed_at: transaction.transaction_date.toISOString(),
      });

      logger.debug('[POSIntegrationService] Transaction events emitted', {
        org_id: transaction.org_id,
        transaction_id: transaction.id,
      });
    } catch (error) {
      logger.error('[POSIntegrationService] Failed to emit transaction events', {
        error,
        transaction_id: transaction.id,
      });
      // Don't throw - event emission failure shouldn't block transaction storage
    }
  }

  /**
   * Emit sync event to event bus
   */
  private async emitSyncEvent(
    orgId: string,
    outletId: string | undefined,
    result: POSSyncResult
  ): Promise<void> {
    try {
      // Import event emitter if available
      // This would emit to unified event bus for system-wide notifications
      logger.debug('[POSIntegrationService] Sync event', {
        org_id: orgId,
        outlet_id: outletId,
        result,
      });
    } catch (error) {
      logger.error('[POSIntegrationService] Failed to emit sync event', { error, org_id: orgId });
    }
  }

  /**
   * Map database record to POSConfig
   */
  private mapConfigFromDB(data: any): POSConfig {
    return {
      id: data.id,
      org_id: data.org_id,
      outlet_id: data.outlet_id,
      pos_type: data.pos_type,
      display_name: data.display_name,
      api_key: data.api_key,
      api_secret: data.api_secret,
      api_token: data.api_token,
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      sync_enabled: data.sync_enabled,
      sync_frequency_minutes: data.sync_frequency_minutes,
      last_sync_at: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
      active: data.active,
      metadata: data.metadata || {},
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}

// Export singleton instance
export const posIntegrationService = new POSIntegrationService();
