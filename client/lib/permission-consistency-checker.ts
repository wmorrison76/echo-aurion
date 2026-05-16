/**
 * AI^3 Permission Consistency Checker
 * Uses Echo AI3 cognition engines to detect permission inconsistencies
 * Flags: Role/outlet mismatches, excessive permissions, missing expected permissions
 */

export interface PermissionCheck {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  suggestion: string;
}

export interface ConsistencyReport {
  userId: string;
  userName: string;
  checks: PermissionCheck[];
  overallStatus: 'ok' | 'warning' | 'critical';
  score: number; // 0-100, higher is better
}

/**
 * Check role-department alignment
 * AI^3 Logic: Culinary roles should be in culinary departments,
 * Pastry roles in pastry, Finance roles in finance, etc.
 */
function checkRoleDepartmentAlignment(
  roleName: string,
  departments: string[]
): PermissionCheck[] {
  const checks: PermissionCheck[] = [];

  const roleKeywords = {
    culinary: ['Executive Chef', 'Sous Chef', 'Line Cook', 'Head Chef'],
    pastry: ['Pastry Chef', 'Pastry Assistant'],
    finance: ['Finance Director', 'Accountant', 'Controller'],
    housekeeping: ['Housekeeping Manager', 'Housekeeper'],
    engineering: ['Engineering Manager', 'Technician'],
  };

  let expectedDepts: string[] = [];
  for (const [dept, keywords] of Object.entries(roleKeywords)) {
    if (keywords.some((kw) => roleName.toLowerCase().includes(kw.toLowerCase()))) {
      expectedDepts.push(dept.toUpperCase());
    }
  }

  if (expectedDepts.length > 0 && departments.length > 0) {
    const hasMismatch = !expectedDepts.some((dept) =>
      departments.some((d) => d.toLowerCase().includes(dept.toLowerCase()))
    );

    if (hasMismatch) {
      checks.push({
        severity: 'critical',
        type: 'ROLE_DEPARTMENT_MISMATCH',
        message: `${roleName} assigned to ${departments.join(', ')} but expects ${expectedDepts.join(' or ')}`,
        suggestion: `Move user to a ${expectedDepts.join(' or ')} department or change their role`,
      });
    }
  }

  return checks;
}

/**
 * Check outlet accessibility
 * AI^3 Logic: Users should only see/access outlets in their department
 */
function checkOutletAccess(
  roleLevel: number,
  department: string,
  outletDepartment: string
): PermissionCheck[] {
  const checks: PermissionCheck[] = [];

  // If role level is low (< 2), they should only access their department
  if (roleLevel < 2 && department !== outletDepartment) {
    checks.push({
      severity: 'warning',
      type: 'CROSS_DEPARTMENT_ACCESS',
      message: `Junior staff (${roleLevel}) has access to ${outletDepartment}, but belongs to ${department}`,
      suggestion: `Restrict to same-department outlets or promote to higher role level`,
    });
  }

  return checks;
}

/**
 * Check permission scope
 * AI^3 Logic: Higher role levels should have broader permissions
 * Lower levels should be more restricted
 */
function checkPermissionScope(
  roleLevel: number,
  permissionCount: number,
  expectedCountByLevel: Record<number, number>
): PermissionCheck[] {
  const checks: PermissionCheck[] = [];

  const expected = expectedCountByLevel[roleLevel] || 5;
  const lowThreshold = expected * 0.5;
  const highThreshold = expected * 2;

  if (permissionCount < lowThreshold) {
    checks.push({
      severity: 'info',
      type: 'INSUFFICIENT_PERMISSIONS',
      message: `User has ${permissionCount} permissions but role level ${roleLevel} typically needs ~${expected}`,
      suggestion: `Review if user has all necessary permissions for their role level`,
    });
  }

  if (permissionCount > highThreshold) {
    checks.push({
      severity: 'warning',
      type: 'EXCESSIVE_PERMISSIONS',
      message: `User has ${permissionCount} permissions (${Math.round((permissionCount / expected) * 100)}% above expected for level ${roleLevel})`,
      suggestion: `Audit and remove unnecessary permissions to follow principle of least privilege`,
    });
  }

  return checks;
}

/**
 * Check for conflicting permissions
 * AI^3 Logic: Some actions shouldn't be combined (e.g., user shouldn't be able to
 * both create and approve their own work, or access finance if they're operational staff)
 */
function checkConflictingPermissions(actions: string[]): PermissionCheck[] {
  const checks: PermissionCheck[] = [];

  // Check for conflicting patterns
  const hasCreate = actions.some((a) => a.includes(':create'));
  const hasApprove = actions.some((a) => a.includes(':approve'));
  const hasDelete = actions.some((a) => a.includes(':delete'));
  const hasBudgetAccess = actions.some((a) => a.includes('budget'));
  const hasPayrollAccess = actions.some((a) => a.includes('payroll'));

  // Operational staff shouldn't have both create and approve
  if (hasCreate && hasApprove) {
    const createdModules = actions
      .filter((a) => a.includes(':create'))
      .map((a) => a.split(':')[0]);
    const approvedModules = actions
      .filter((a) => a.includes(':approve'))
      .map((a) => a.split(':')[0]);

    const overlap = createdModules.filter((m) => approvedModules.includes(m));
    if (overlap.length > 0) {
      checks.push({
        severity: 'critical',
        type: 'SEGREGATION_OF_DUTIES_VIOLATION',
        message: `User can both create AND approve ${overlap.join(', ')} - violates segregation of duties`,
        suggestion: `Remove either create or approve permission to separate conflicting duties`,
      });
    }
  }

  // Operational staff (non-finance) shouldn't have budget/payroll access
  if ((hasBudgetAccess || hasPayrollAccess) && !actions.some((a) => a.includes('finance'))) {
    checks.push({
      severity: 'warning',
      type: 'INAPPROPRIATE_FINANCIAL_ACCESS',
      message: `Non-finance user has access to financial controls`,
      suggestion: `Review if this access is necessary, consider restricting to finance roles only`,
    });
  }

  return checks;
}

/**
 * Main consistency check function
 */
export function checkPermissionConsistency(
  userId: string,
  userName: string,
  roleName: string,
  roleLevel: number,
  department: string,
  outletDepartment: string,
  actions: string[],
  expectedCountByLevel: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 25, 5: 50 }
): ConsistencyReport {
  const allChecks: PermissionCheck[] = [];

  // Run all checks
  allChecks.push(...checkRoleDepartmentAlignment(roleName, [department]));
  allChecks.push(...checkOutletAccess(roleLevel, department, outletDepartment));
  allChecks.push(...checkPermissionScope(roleLevel, actions.length, expectedCountByLevel));
  allChecks.push(...checkConflictingPermissions(actions));

  // Calculate overall status
  const criticalCount = allChecks.filter((c) => c.severity === 'critical').length;
  const warningCount = allChecks.filter((c) => c.severity === 'warning').length;

  let overallStatus: 'ok' | 'warning' | 'critical' = 'ok';
  if (criticalCount > 0) overallStatus = 'critical';
  else if (warningCount > 0) overallStatus = 'warning';

  // Calculate score (0-100)
  const criticalPenalty = criticalCount * 20;
  const warningPenalty = warningCount * 10;
  const score = Math.max(0, 100 - criticalPenalty - warningPenalty);

  return {
    userId,
    userName,
    checks: allChecks,
    overallStatus,
    score,
  };
}

/**
 * AI^3 Pattern Recognition: Detect suspicious patterns
 */
export function detectSuspiciousPatterns(userReports: ConsistencyReport[]): string[] {
  const patterns: string[] = [];

  // Pattern 1: Multiple users with same inconsistency
  const inconsistencyTypes = new Map<string, number>();
  userReports.forEach((report) => {
    report.checks.forEach((check) => {
      inconsistencyTypes.set(check.type, (inconsistencyTypes.get(check.type) || 0) + 1);
    });
  });

  for (const [type, count] of inconsistencyTypes) {
    if (count > 2) {
      patterns.push(`Multiple users have ${type} (${count} occurrences)`);
    }
  }

  // Pattern 2: Average score too low
  const avgScore = userReports.reduce((sum, r) => sum + r.score, 0) / userReports.length;
  if (avgScore < 60) {
    patterns.push(`Average permission consistency score is ${Math.round(avgScore)} - systematic review needed`);
  }

  // Pattern 3: Critical issues affecting > 20% of users
  const criticalUsers = userReports.filter((r) => r.overallStatus === 'critical').length;
  if (criticalUsers / userReports.length > 0.2) {
    patterns.push(`${Math.round((criticalUsers / userReports.length) * 100)}% of users have critical permission issues`);
  }

  return patterns;
}
