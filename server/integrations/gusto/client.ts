/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 4 Day 19
 * Gusto API Client (Alternative to Rippling)
 * 
 * Integrates with Gusto HR/Payroll Platform:
 * - OAuth2 authentication with refresh tokens
 * - Pull employee list from Gusto
 * - Push LUCCCA employees to Gusto
 * - Pull timesheets from Gusto
 * - Submit payroll runs for approval
 * - Fetch payroll approval status
 * - Field mapping between LUCCCA and Gusto schemas
 * - Error handling, retries, audit logging
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../lib/logger';

interface GustoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

interface GustoEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  hireDate: string;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  jobTitle: string;
  department: string;
  managerEmail?: string;
  salary?: number;
  hourlyRate?: number;
  status: 'active' | 'inactive' | 'terminated';
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

interface GustoTimesheet {
  id: string;
  employeeId: string;
  checkDate: string;
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
  gustoCheckId?: string;
  createdAt: Date;
}

export class GustoClient {
  private client: AxiosInstance;
  private config: GustoConfig;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: GustoConfig) {
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
      scope: 'employees read timesheets read payroll write',
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

      logger.info('Gusto OAuth token exchange successful');

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
    } catch (error) {
      logger.error('Gusto OAuth token exchange failed', {
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

      logger.debug('Gusto access token refreshed');
    } catch (error) {
      logger.error('Gusto token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch employee list from Gusto
   */
  async getEmployees(limit: number = 100, offset: number = 0): Promise<GustoEmployee[]> {
    try {
      const response = await this.client.get('/employees', {
        params: { per_page: limit, page: Math.floor(offset / limit) + 1 },
      });

      logger.info('Employees fetched from Gusto', {
        count: response.data.employees.length,
      });

      return response.data.employees;
    } catch (error) {
      logger.error('Failed to fetch employees from Gusto', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create employee in Gusto
   */
  async createEmployee(employee: LucccaEmployee): Promise<GustoEmployee> {
    try {
      const gustoEmployee = this.mapToGusto(employee);

      const response = await this.client.post('/employees', gustoEmployee);

      logger.info('Employee created in Gusto', {
        employeeId: response.data.id,
        name: employee.name,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create employee in Gusto', {
        employeeEmail: employee.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update employee in Gusto
   */
  async updateEmployee(gustoId: string, employee: Partial<LucccaEmployee>): Promise<GustoEmployee> {
    try {
      const gustoEmployee = this.mapToGusto(employee as LucccaEmployee);

      const response = await this.client.put(`/employees/${gustoId}`, gustoEmployee);

      logger.info('Employee updated in Gusto', { gustoId });

      return response.data;
    } catch (error) {
      logger.error('Failed to update employee in Gusto', {
        gustoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch timesheets from Gusto
   */
  async getTimesheets(checkDate: string): Promise<GustoTimesheet[]> {
    try {
      const response = await this.client.get('/timesheets', {
        params: { check_date: checkDate },
      });

      logger.info('Timesheets fetched from Gusto', {
        count: response.data.timesheets.length,
      });

      return response.data.timesheets;
    } catch (error) {
      logger.error('Failed to fetch timesheets from Gusto', {
        checkDate,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit payroll run to Gusto (creates a check run)
   */
  async submitPayroll(payroll: PayrollRun, timesheets: GustoTimesheet[]): Promise<string> {
    try {
      const payload = {
        payroll_period_start_date: payroll.period.split(' to ')[0],
        payroll_period_end_date: payroll.period.split(' to ')[1],
        check_date: new Date().toISOString().split('T')[0],
        timesheets: timesheets.map((t) => ({
          employee_id: t.employeeId,
          hours: t.hoursWorked,
          overtime_hours: t.overtimeHours,
        })),
      };

      const response = await this.client.post('/payroll/check_runs', payload);

      const checkId = response.data.check_run_id;

      logger.info('Payroll submitted to Gusto', {
        checkId,
        employeeCount: timesheets.length,
        totalPayroll: payroll.totalPayroll,
      });

      return checkId;
    } catch (error) {
      logger.error('Failed to submit payroll to Gusto', {
        period: payroll.period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch payroll approval status
   */
  async getPayrollStatus(checkId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: string;
    rejectionReason?: string;
  }> {
    try {
      const response = await this.client.get(`/payroll/check_runs/${checkId}`);

      logger.debug('Gusto payroll status fetched', {
        checkId,
        status: response.data.status,
      });

      return {
        status: response.data.status,
        approvedAt: response.data.approved_at,
        rejectionReason: response.data.rejection_reason,
      };
    } catch (error) {
      logger.error('Failed to fetch payroll status from Gusto', {
        checkId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync employees from LUCCCA to Gusto (bulk)
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

    logger.info('Gusto employee sync completed', {
      succeeded: results.succeeded,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Map LUCCCA employee to Gusto schema
   */
  private mapToGusto(employee: LucccaEmployee): GustoEmployee {
    const [firstName, ...lastNameParts] = employee.name.split(' ');
    const lastName = lastNameParts.join(' ') || 'Unknown';

    return {
      id: employee.id,
      firstName,
      lastName,
      email: employee.email,
      phoneNumber: employee.phone,
      hireDate: employee.startDate,
      employmentType: this.mapEmploymentType(employee.employmentType),
      jobTitle: employee.position,
      department: employee.department,
      managerEmail: employee.managerEmail,
      hourlyRate: employee.hourlyRate,
      status: employee.status,
    };
  }

  /**
   * Map employment type
   */
  private mapEmploymentType(
    type: LucccaEmployee['employmentType']
  ): GustoEmployee['employmentType'] {
    switch (type) {
      case 'full-time':
        return 'full_time';
      case 'part-time':
        return 'part_time';
      case 'seasonal':
        return 'contractor';
      default:
        return 'part_time';
    }
  }
}

/**
 * Factory function
 */
export function createGustoClient(config: GustoConfig): GustoClient {
  return new GustoClient(config);
}
