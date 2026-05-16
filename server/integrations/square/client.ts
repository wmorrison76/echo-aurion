/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 5 Day 24
 * Square/Clover API Client (Alternative to Toast)
 * 
 * Integrates with Square POS REST API:
 * - OAuth2 authentication
 * - Fetch locations
 * - Fetch orders (backfill historical data)
 * - Fetch transactions
 * - Fetch revenue summaries
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../lib/logger';

interface SquareConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

interface SquareLocation {
  id: string;
  name: string;
  address: {
    address_line_1: string;
    locality: string;
    administrative_district_level_1: string;
    postal_code: string;
  };
  timezone: string;
  businessHours?: any;
}

interface SquareOrder {
  id: string;
  locationId: string;
  createdAt: string;
  closedAt?: string;
  state: 'OPEN' | 'COMPLETED' | 'CANCELED';
  total: number;
  lineItems: SquareLineItem[];
}

interface SquareLineItem {
  uid: string;
  name: string;
  quantity: string;
  quantityUnit: {
    measurementUnit: {
      type: string;
    };
  };
  basePriceMoney: {
    amount: number;
    currency: string;
  };
  grossSalesMoney: {
    amount: number;
    currency: string;
  };
}

interface SquareTransaction {
  id: string;
  locationId: string;
  createdAt: string;
  amount: number;
  transactionType: 'PAYMENT' | 'REFUND';
  currency: string;
  details?: any;
}

export class SquareClient {
  private client: AxiosInstance;
  private config: SquareConfig;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: SquareConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LUCCCA-POS/1.0',
        'Square-Version': '2023-12-13', // Use latest Square API version
      },
    });

    // Add request interceptor for auth
    this.client.interceptors.request.use((config) => {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.client.request(error.config);
          } catch (err) {
            logger.error('Square token refresh failed', { error: String(err) });
            throw err;
          }
        }
        throw error;
      }
    );
  }

  /**
   * Initialize OAuth2 flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'MERCHANT_PROFILE_READ ORDERS_READ PAYMENTS_READ',
      state,
    });

    return `${this.config.baseUrl}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        })
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.info('Square OAuth token exchange successful');

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
    } catch (error) {
      logger.error('Square OAuth token exchange failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        })
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.debug('Square access token refreshed');
    } catch (error) {
      logger.error('Square token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch locations
   */
  async getLocations(): Promise<SquareLocation[]> {
    try {
      const response = await this.client.get('/locations');

      logger.info('Square locations fetched', {
        count: response.data.locations.length,
      });

      return response.data.locations;
    } catch (error) {
      logger.error('Failed to fetch Square locations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch orders for a date range
   */
  async getOrders(
    locationId: string,
    startDate: string,
    endDate: string,
    cursor?: string
  ): Promise<{ orders: SquareOrder[]; cursor?: string }> {
    try {
      const response = await this.client.post('/orders/search', {
        locationIds: [locationId],
        query: {
          filter: {
            dateTimeFilter: {
              createdAt: {
                startAt: startDate,
                endAt: endDate,
              },
            },
          },
        },
        limit: 100,
        cursor,
      });

      logger.debug('Square orders fetched', {
        locationId,
        count: response.data.orders?.length || 0,
      });

      return {
        orders: response.data.orders || [],
        cursor: response.data.cursor,
      };
    } catch (error) {
      logger.error('Failed to fetch Square orders', {
        locationId,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch transactions
   */
  async getTransactions(
    locationId: string,
    beginTime: string,
    endTime: string,
    cursor?: string
  ): Promise<{ transactions: SquareTransaction[]; cursor?: string }> {
    try {
      const response = await this.client.get(`/locations/${locationId}/transactions`, {
        params: {
          begin_time: beginTime,
          end_time: endTime,
          cursor,
          limit: 100,
        },
      });

      logger.debug('Square transactions fetched', {
        locationId,
        count: response.data.transactions?.length || 0,
      });

      return {
        transactions: response.data.transactions || [],
        cursor: response.data.cursor,
      };
    } catch (error) {
      logger.error('Failed to fetch Square transactions', {
        locationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch revenue report
   */
  async getRevenueReport(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
  }> {
    try {
      // Fetch all orders for the period
      let allOrders: SquareOrder[] = [];
      let cursor: string | undefined;

      do {
        const result = await this.getOrders(locationId, startDate, endDate, cursor);
        allOrders = allOrders.concat(result.orders);
        cursor = result.cursor;
      } while (cursor);

      const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
      const orderCount = allOrders.length;
      const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      logger.info('Square revenue report generated', {
        locationId,
        totalRevenue,
        orderCount,
        averageOrderValue,
      });

      return {
        totalRevenue,
        orderCount,
        averageOrderValue,
      };
    } catch (error) {
      logger.error('Failed to generate Square revenue report', {
        locationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Factory function
 */
export function createSquareClient(config: SquareConfig): SquareClient {
  return new SquareClient(config);
}
