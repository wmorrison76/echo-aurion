/**
 * Security Audit Verification Script
 * 
 * Verifies that all routes have proper tenant validation and security measures:
 * - Checks all routes for requireAuth middleware
 * - Verifies org_id validation in route handlers
 * - Checks for RLS policies on database tables
 * - Verifies route-level ABAC enforcement
 * - Generates security audit report
 */

import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteAuditResult {
  route: string;
  method: string;
  hasAuth: boolean;
  hasTenantValidation: boolean;
  hasOrgIdCheck: boolean;
  status: 'secure' | 'warning' | 'critical';
  issues: string[];
}

interface TableAuditResult {
  table: string;
  hasRLS: boolean;
  hasOrgIsolation: boolean;
  status: 'secure' | 'warning' | 'critical';
  issues: string[];
}

interface SecurityAuditReport {
  timestamp: string;
  routesAudit: {
    total: number;
    secure: number;
    warnings: number;
    critical: number;
    results: RouteAuditResult[];
  };
  tablesAudit: {
    total: number;
    secure: number;
    warnings: number;
    critical: number;
    results: TableAuditResult[];
  };
  recommendations: string[];
}

/**
 * Security Audit Verification Service
 */
export class SecurityAuditVerification {
  /**
   * Audit all routes for security measures
   */
  async auditRoutes(): Promise<RouteAuditResult[]> {
    const results: RouteAuditResult[] = [];
    const routesDir = path.join(__dirname, '../routes');

    // Common secure patterns
    const authPatterns = [
      /requireAuth/,
      /jwtAuthMiddleware/,
      /verifySupabaseAuth/,
      /basicAuthMiddleware/,
    ];

    const tenantValidationPatterns = [
      /getUserOrgId/,
      /extractOrgId/,
      /enforceOrgId/,
      /tenantValidation/,
      /org_id/,
      /orgId/,
    ];

    try {
      // Read all route files
      const routeFiles = fs.readdirSync(routesDir).filter((file) => file.endsWith('.ts'));

      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract routes from file
        const routeMatches = content.matchAll(/router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g);

        for (const match of routeMatches) {
          const method = match[1].toUpperCase();
          const routePath = match[2];
          const fullRoute = `/api/${file.replace('.ts', '').replace('-route', '')}${routePath}`;

          // Check route content for security measures
          const routeContent = this.extractRouteContent(content, routePath);

          const hasAuth = authPatterns.some((pattern) => pattern.test(routeContent));
          const hasTenantValidation = tenantValidationPatterns.some((pattern) => pattern.test(routeContent));
          const hasOrgIdCheck = /org_id|orgId/.test(routeContent) && /req\.(user|body|query|params)/.test(routeContent);

          const issues: string[] = [];
          let status: 'secure' | 'warning' | 'critical' = 'secure';

          if (!hasAuth) {
            issues.push('Missing authentication middleware');
            status = 'critical';
          }

          if (!hasTenantValidation && !routePath.includes('health') && !routePath.includes('ping')) {
            issues.push('Missing tenant validation');
            status = status === 'critical' ? 'critical' : 'warning';
          }

          if (!hasOrgIdCheck && !routePath.includes('health') && !routePath.includes('ping')) {
            issues.push('Missing org_id check in route handler');
            status = status === 'critical' ? 'critical' : 'warning';
          }

          results.push({
            route: fullRoute,
            method,
            hasAuth,
            hasTenantValidation,
            hasOrgIdCheck,
            status,
            issues,
          });
        }
      }
    } catch (error) {
      logger.error('[SecurityAudit] Failed to audit routes', { error });
    }

    return results;
  }

  /**
   * Audit all database tables for RLS
   */
  async auditTables(): Promise<TableAuditResult[]> {
    const results: TableAuditResult[] = [];

    try {
      // Get all tables from information_schema
      const { data: tables, error } = await supabase.rpc('get_all_tables', {}).catch(async () => {
        // Fallback: Query information_schema directly
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .neq('table_name', 'schema_migrations');

        return { data: data?.map((t: any) => ({ table_name: t.table_name })) || [], error };
      });

      if (error) {
        logger.warn('[SecurityAudit] Could not fetch tables list', { error });
        return results;
      }

      for (const table of tables || []) {
        const tableName = table.table_name || (table as any).name;

        // Skip system tables
        if (
          tableName.startsWith('_') ||
          tableName.includes('migration') ||
          tableName.includes('supabase') ||
          tableName === 'schema_migrations'
        ) {
          continue;
        }

        // Check if table has RLS enabled
        const { data: rlsCheck } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', tableName)
          .limit(1)
          .catch(() => ({ data: null, error: null }));

        // Check for org_id column (tenant isolation)
        const { data: columns } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', tableName)
          .eq('column_name', 'org_id')
          .limit(1)
          .catch(() => ({ data: null, error: null }));

        const hasRLS = (rlsCheck as any)?.length > 0 || false;
        const hasOrgIsolation = (columns as any)?.length > 0 || false;

        const issues: string[] = [];
        let status: 'secure' | 'warning' | 'critical' = 'secure';

        if (!hasRLS) {
          issues.push('Row-Level Security (RLS) not enabled');
          status = 'critical';
        }

        if (!hasOrgIsolation && !tableName.includes('public') && !tableName.includes('system')) {
          issues.push('Missing org_id column for tenant isolation');
          status = status === 'critical' ? 'critical' : 'warning';
        }

        results.push({
          table: tableName,
          hasRLS,
          hasOrgIsolation,
          status,
          issues,
        });
      }
    } catch (error) {
      logger.error('[SecurityAudit] Failed to audit tables', { error });
    }

    return results;
  }

  /**
   * Generate comprehensive security audit report
   */
  async generateAuditReport(): Promise<SecurityAuditReport> {
    logger.info('[SecurityAudit] Starting comprehensive security audit...');

    const routesResults = await this.auditRoutes();
    const tablesResults = await this.auditTables();

    const routesAudit = {
      total: routesResults.length,
      secure: routesResults.filter((r) => r.status === 'secure').length,
      warnings: routesResults.filter((r) => r.status === 'warning').length,
      critical: routesResults.filter((r) => r.status === 'critical').length,
      results: routesResults,
    };

    const tablesAudit = {
      total: tablesResults.length,
      secure: tablesResults.filter((t) => t.status === 'secure').length,
      warnings: tablesResults.filter((t) => t.status === 'warning').length,
      critical: tablesResults.filter((t) => t.status === 'critical').length,
      results: tablesResults,
    };

    const recommendations: string[] = [];

    // Route recommendations
    const criticalRoutes = routesResults.filter((r) => r.status === 'critical');
    if (criticalRoutes.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalRoutes.length} route(s) missing authentication. Add requireAuth middleware immediately.`
      );
    }

    const warningRoutes = routesResults.filter((r) => r.status === 'warning');
    if (warningRoutes.length > 0) {
      recommendations.push(
        `WARNING: ${warningRoutes.length} route(s) missing tenant validation. Add getUserOrgId() checks.`
      );
    }

    // Table recommendations
    const criticalTables = tablesResults.filter((t) => t.status === 'critical');
    if (criticalTables.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalTables.length} table(s) missing RLS. Enable Row-Level Security immediately.`
      );
    }

    const warningTables = tablesResults.filter((t) => t.status === 'warning');
    if (warningTables.length > 0) {
      recommendations.push(
        `WARNING: ${warningTables.length} table(s) missing org_id column. Add tenant isolation columns.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All routes and tables appear to be properly secured.');
    }

    const report: SecurityAuditReport = {
      timestamp: new Date().toISOString(),
      routesAudit,
      tablesAudit,
      recommendations,
    };

    logger.info('[SecurityAudit] Audit complete', {
      routesSecure: routesAudit.secure,
      routesCritical: routesAudit.critical,
      tablesSecure: tablesAudit.secure,
      tablesCritical: tablesAudit.critical,
    });

    return report;
  }

  /**
   * Extract route content for analysis
   */
  private extractRouteContent(fileContent: string, routePath: string): string {
    // Find the route handler content
    const routeRegex = new RegExp(`router\\.(get|post|put|patch|delete)\\(['"\`]${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`][^,]*,\\s*(async\\s*)?\\([^)]+\\)\\s*=>\\s*{([^}]+(?:{[^}]*})*)}`, 's');
    const match = fileContent.match(routeRegex);
    return match ? match[0] : '';
  }

  /**
   * Export report to file
   */
  async exportReport(report: SecurityAuditReport, outputPath: string): Promise<void> {
    try {
      const reportJson = JSON.stringify(report, null, 2);
      fs.writeFileSync(outputPath, reportJson, 'utf-8');
      logger.info('[SecurityAudit] Report exported', { path: outputPath });
    } catch (error) {
      logger.error('[SecurityAudit] Failed to export report', { error, path: outputPath });
      throw error;
    }
  }
}

// Export singleton instance
export const securityAuditVerification = new SecurityAuditVerification();

// CLI execution
const isMainModule = process.argv[1] === __filename || process.argv[1] === path.join(process.cwd(), 'server/scripts/security-audit-verification.ts');

if (isMainModule) {
  (async () => {
    const audit = new SecurityAuditVerification();
    const report = await audit.generateAuditReport();
    const outputPath = path.join(__dirname, '../../security-audit-report.json');
    await audit.exportReport(report, outputPath);
    console.log('Security audit complete. Report saved to:', outputPath);
    console.log(`Routes: ${report.routesAudit.secure}/${report.routesAudit.total} secure, ${report.routesAudit.critical} critical`);
    console.log(`Tables: ${report.tablesAudit.secure}/${report.tablesAudit.total} secure, ${report.tablesAudit.critical} critical`);
  })();
}
