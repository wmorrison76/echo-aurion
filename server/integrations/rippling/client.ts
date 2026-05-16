/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 4 Day 17
 * Rippling API Client
 * 
 * Integrates with Rippling HR/Payroll Platform:
 * - OAuth2 authentication with refresh tokens
 * - Pull employee list from Rippling
 * - Push LUCCCA employees to Rippling
 * - Pull timesheets from Rippling
 * - Submit payroll runs for approval
 * - Fetch payroll approval status
 * - Field mapping between LUCCCA and Rippling schemas
 * - Error handling, retries, audit logging
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../lib/logger';

interface RipplingConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

interface RipplingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  startDate: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
  jobTitle: string;
  department: string;
  reportsTo?: string;
  salary?: number;
  hourlyRate?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

interface LucccaEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  startDate: string;
  employmentType: 'full-time' | 'part-time' | 'seasonal';
  position: string;
  department: string;
  managerEmail?: string;
  hourlyRate: number;
  status: 'active' | 'inactive' | 'terminated';
}

interface RipplingTimesheet {
  id: string;
  employeeId: string;
  weekEnding: string;
  hoursWorked: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  deductions: number;
  grossPay: number;
}

interface PayrollRun {
  id: string;
  orgId: string;
  period: string;
  employeeCount: number;
  totalPayroll: number;
  status: 'pending' | 'approved' | 'submitted' | 'completed' | 'failed';
  ripplingRunId?: string;
  createdAt: Date;
}

export class RipplingClient {
  private client: AxiosInstance;
  private config: RipplingConfig;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: RipplingConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LUCCCA-Payroll/1.0',
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
            logger.error('Token refresh failed', { error: String(err) });
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
      scope: 'employees:read employees:write timesheets:read payroll:write',
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

      logger.info('OAuth token exchange successful');

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
    } catch (error) {
      logger.error('OAuth token exchange failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
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

      logger.debug('Access token refreshed');
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch employee list from Rippling
   */
  async getEmployees(limit: number = 100, offset: number = 0): Promise<RipplingEmployee[]> {
    try {
      const response = await this.client.get('/employees', {
        params: { limit, offset },
      });

      logger.info('Employees fetched from Rippling', {
        count: response.data.data.length,
        total: response.data.total,
      });

      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch employees from Rippling', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create employee in Rippling
   */
  async createEmployee(employee: LucccaEmployee): Promise<RipplingEmployee> {
    try {
      const ripplingEmployee = this.mapToRippling(employee);

      const response = await this.client.post('/employees', ripplingEmployee);

      logger.info('Employee created in Rippling', {
        employeeId: response.data.id,
        name: employee.name,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create employee in Rippling', {
        employeeEmail: employee.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update employee in Rippling
   */
  async updateEmployee(ripplingId: string, employee: Partial<LucccaEmployee>): Promise<RipplingEmployee> {
    try {
      const ripplingEmployee = this.mapToRippling(employee as LucccaEmployee);

      const response = await this.client.patch(`/employees/${ripplingId}`, ripplingEmployee);

      logger.info('Employee updated in Rippling', { ripplingId });

      return response.data;
    } catch (error) {
      logger.error('Failed to update employee in Rippling', {
        ripplingId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch timesheets from Rippling
   */
  async getTimesheets(weekEnding: string): Promise<RipplingTimesheet[]> {
    try {
      const response = await this.client.get('/timesheets', {
        params: { weekEnding },
      });

      logger.info('Timesheets fetched from Rippling', {
        count: response.data.data.length,
      });

      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch timesheets from Rippling', {
        weekEnding,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit payroll run to Rippling
   */
  async submitPayroll(payroll: PayrollRun, timesheets: RipplingTimesheet[]): Promise<string> {
    try {
      const payload = {
        payPeriod: payroll.period,
        employees: timesheets.map((t) => ({
          employeeId: t.employeeId,
          hours: t.hoursWorked,
          overtime: t.overtimeHours,
          grossPay: t.grossPay,
          deductions: t.deductions,
        })),
      };

      const response = await this.client.post('/payroll/submit', payload);

      const ripplingRunId = response.data.payrollRunId;

      logger.info('Payroll submitted to Rippling', {
        ripplingRunId,
        employeeCount: timesheets.length,
        totalPayroll: payroll.totalPayroll,
      });

      return ripplingRunId;
    } catch (error) {
      logger.error('Failed to submit payroll to Rippling', {
        period: payroll.period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch payroll approval status
   */
  async getPayrollStatus(ripplingRunId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: string;
    rejectionReason?: string;
  }> {
    try {
      const response = await this.client.get(`/payroll/${ripplingRunId}`);

      logger.debug('Payroll status fetched', {
        ripplingRunId,
        status: response.data.status,
      });

      return {
        status: response.data.status,
        approvedAt: response.data.approvedAt,
        rejectionReason: response.data.rejectionReason,
      };
    } catch (error) {
      logger.error('Failed to fetch payroll status', {
        ripplingRunId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync employees from LUCCCA to Rippling (bulk)
   */
  async syncEmployees(employees: LucccaEmployee[]): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = { succeeded: 0, failed: 0, errors: [] as any[] };

    for (const employee of employees) {
      try {
        await this.createEmployee(employee);
        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: employee.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Employee sync completed', {
      succeeded: results.succeeded,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Map LUCCCA employee to Rippling schema
   */
  private mapToRippling(employee: LucccaEmployee): RipplingEmployee {
    const [firstName, ...lastNameParts] = employee.name.split(' ');
    const lastName = lastNameParts.join(' ') || 'Unknown';

    return {
      id: employee.id,
      firstName,
      lastName,
      email: employee.email,
      phoneNumber: employee.phone,
      startDate: employee.startDate,
      employmentType: this.mapEmploymentType(employee.employmentType),
      jobTitle: employee.position,
      department: employee.department,
      reportsTo: employee.managerEmail,
      hourlyRate: employee.hourlyRate,
      status: this.mapStatus(employee.status),
    };
  }

  /**
   * Map employment type
   */
  private mapEmploymentType(
    type: LucccaEmployee['employmentType']
  ): RipplingEmployee['employmentType'] {
    switch (type) {
      case 'full-time':
        return 'FULL_TIME';
      case 'part-time':
        return 'PART_TIME';
      case 'seasonal':
        return 'CONTRACTOR';
      default:
        return 'PART_TIME';
    }
  }

  /**
   * Map status
   */
  private mapStatus(status: LucccaEmployee['status']): RipplingEmployee['status'] {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'inactive':
        return 'INACTIVE';
      case 'terminated':
        return 'TERMINATED';
      default:
        return 'ACTIVE';
    }
  }
}

/**
 * Factory function
 */
export function createRipplingClient(config: RipplingConfig): RipplingClient {
  return new RipplingClient(config);
}
