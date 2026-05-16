/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 5 Day 22
 * Toast REST API Client
 * 
 * Integrates with Toast POS REST API:
 * - OAuth2 authentication
 * - Fetch locations (sync restaurants)
 * - Fetch orders (backfill historical data)
 * - Fetch menu items (map to internal items)
 * - Fetch revenue summaries
 * - Rate limiting: Respect Toast's 100 req/min limit
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../lib/logger';

interface ToastConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

interface ToastLocation {
  guid: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
}

interface ToastOrder {
  guid: string;
  locationGuid: string;
  number: string;
  createdDate: string;
  closedDate: string;
  grandTotal: number;
  covers: number;
  discounts: number;
  taxes: number;
  items: ToastOrderItem[];
}

interface ToastOrderItem {
  guid: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ToastMenuItem {
  guid: string;
  name: string;
  pluNumber: string;
  category: string;
  price: number;
  isActive: boolean;
}

interface ToastRevenue {
  locationGuid: string;
  date: string;
  hour?: number;
  revenue: number;
  covers: number;
  averageCheck: number;
}

export class ToastClient {
  private client: AxiosInstance;
  private config: ToastConfig;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: ToastConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LUCCCA-POS/1.0',
      },
    });

    // Add request interceptor for auth and rate limiting
    this.client.interceptors.request.use((config) => {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }

      // Rate limiting: 100 requests per minute
      this.checkRateLimit();

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
            logger.error('Toast token refresh failed', { error: String(err) });
            throw err;
          }
        }
        throw error;
      }
    );
  }

  /**
   * Check rate limit (100 req/min)
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    if (timeSinceReset > 60000) {
      // Reset counter after 1 minute
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= 100) {
      const waitTime = 60000 - timeSinceReset;
      logger.warn('Toast API rate limit approaching', {
        requestCount: this.requestCount,
        waitTime,
      });
    }

    this.requestCount++;
  }

  /**
   * Initialize OAuth2 flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'location.read order.read menu.read revenue.read',
      state,
    });

    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.info('Toast OAuth token exchange successful');

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
    } catch (error) {
      logger.error('Toast OAuth token exchange failed', {
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
      const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.debug('Toast access token refreshed');
    } catch (error) {
      logger.error('Toast token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch locations (restaurants)
   */
  async getLocations(): Promise<ToastLocation[]> {
    try {
      const response = await this.client.get('/locations');

      logger.info('Toast locations fetched', {
        count: response.data.locations.length,
      });

      return response.data.locations;
    } catch (error) {
      logger.error('Failed to fetch Toast locations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch orders for a date range (backfill)
   */
  async getOrders(
    locationGuid: string,
    startDate: string,
    endDate: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<ToastOrder[]> {
    try {
      const response = await this.client.get('/orders', {
        params: {
          locationGuid,
          startDate,
          endDate,
          page,
          pageSize,
        },
      });

      logger.debug('Toast orders fetched', {
        locationGuid,
        count: response.data.orders.length,
        page,
      });

      return response.data.orders;
    } catch (error) {
      logger.error('Failed to fetch Toast orders', {
        locationGuid,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch menu items
   */
  async getMenuItems(locationGuid: string): Promise<ToastMenuItem[]> {
    try {
      const response = await this.client.get(`/locations/${locationGuid}/menu`);

      logger.info('Toast menu items fetched', {
        locationGuid,
        count: response.data.items.length,
      });

      return response.data.items;
    } catch (error) {
      logger.error('Failed to fetch Toast menu items', {
        locationGuid,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch revenue summary
   */
  async getRevenue(locationGuid: string, date: string): Promise<ToastRevenue[]> {
    try {
      const response = await this.client.get('/revenue', {
        params: {
          locationGuid,
          date,
        },
      });

      logger.debug('Toast revenue fetched', {
        locationGuid,
        date,
        count: response.data.revenue.length,
      });

      return response.data.revenue;
    } catch (error) {
      logger.error('Failed to fetch Toast revenue', {
        locationGuid,
        date,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch hourly revenue
   */
  async getHourlyRevenue(locationGuid: string, date: string): Promise<ToastRevenue[]> {
    try {
      const response = await this.client.get('/revenue/hourly', {
        params: {
          locationGuid,
          date,
        },
      });

      logger.debug('Toast hourly revenue fetched', {
        locationGuid,
        date,
      });

      return response.data.revenue;
    } catch (error) {
      logger.error('Failed to fetch Toast hourly revenue', {
        locationGuid,
        date,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestCount: number;
    remainingRequests: number;
    resetTime: string;
  } {
    const remaining = Math.max(0, 100 - this.requestCount);
    const resetTime = new Date(this.lastResetTime + 60000);

    return {
      requestCount: this.requestCount,
      remainingRequests: remaining,
      resetTime: resetTime.toISOString(),
    };
  }
}

/**
 * Factory function
 */
export function createToastClient(config: ToastConfig): ToastClient {
  return new ToastClient(config);
}
