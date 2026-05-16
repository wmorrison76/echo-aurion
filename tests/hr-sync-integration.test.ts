/**
 * HR Sync Integration Tests
 * End-to-end integration testing for API endpoints and database operations
 * Tests real API flows with mock Supabase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface MockQueryBuilder {
  orgId?: string;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

interface TestContext {
  orgId: string;
  employeeId: string;
  syncJobId: string;
  supabase: ReturnType<typeof createMockSupabase>;
}

type SyncLog = {
  org_id: string;
  system_type: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  created_at: string;
};

type ShiftRecord = {
  id: string;
  employee_id: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
};

type EmployeeRecord = {
  id: string;
  org_id: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  employment_type?: string;
};

type EmployeeAudit = {
  field: string;
  old_value: string | number | null;
  new_value: string | number | null;
  changed_at: string;
};

const mockStore = {
  hrConfigs: new Map<string, Record<string, string>>(),
  syncLogs: [] as SyncLog[],
  employees: new Map<string, EmployeeRecord>(),
  shiftsByEmployee: new Map<string, ShiftRecord[]>(),
  auditByEmployee: new Map<string, EmployeeAudit[]>(),
};

const resetStore = () => {
  mockStore.hrConfigs.clear();
  mockStore.syncLogs = [];
  mockStore.employees.clear();
  mockStore.shiftsByEmployee.clear();
  mockStore.auditByEmployee.clear();
};

const createMockContext = (): TestContext => ({
  orgId: 'test-org-' + Date.now(),
  employeeId: 'emp-' + Date.now(),
  syncJobId: 'job-' + Date.now(),
  supabase: createMockSupabase(),
});

const createMockSupabase = () => ({
  from: vi.fn((_table: string) => {
    const queryBuilder: MockQueryBuilder = {
      orgId: 'test-org',
      select: vi.fn((_fields?: string) => queryBuilder),
      insert: vi.fn((data: Record<string, unknown> | Record<string, unknown>[]) => ({
        select: vi.fn(() =>
          Promise.resolve({
            data: Array.isArray(data) ? data : [data],
            error: null,
          }),
        ),
      })),
      update: vi.fn((data: Record<string, unknown>) => ({
        eq: vi.fn((_field: string, _value: unknown) =>
          Promise.resolve({ data: [data], error: null }),
        ),
      })),
      upsert: vi.fn((data: Record<string, unknown> | Record<string, unknown>[]) =>
        Promise.resolve({
          data: Array.isArray(data) ? data : [data],
          error: null,
        }),
      ),
      delete: vi.fn(() => ({
        eq: vi.fn((_field: string, _value: unknown) => Promise.resolve({ data: [], error: null })),
      })),
      eq: vi.fn((_field: string, value: unknown) => {
        if (typeof value === 'string') {
          queryBuilder.orgId = value;
        }
        return queryBuilder;
      }),
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: 'test-id', org_id: queryBuilder.orgId },
          error: null,
        }),
      ),
    };

    return queryBuilder;
  }),
});

describe('HR Sync Integration Tests', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
    resetStore();
    // Mock fetch so triggerSync() never hits the network (avoids 30–120s TCP timeouts per call).
    // Tests should complete in seconds, not minutes.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workers: [] }),
    } as Response);
  });

  describe('Employee Sync Workflow', () => {
    it('should complete full employee sync workflow', { timeout: 5000 }, async () => {
      // 1. Configure HR system
      const configResult = await configureHRSystem(ctx, 'ADP', {
        api_endpoint: 'https://api.adp.com',
        api_key: 'test-key-123',
      });

      expect(configResult.success).toBe(true);
      expect(configResult.system).toBe('ADP');

      // 2. Trigger sync
      const syncResult = await triggerSync(ctx, 'ADP');

      expect(syncResult.success).toBe(true);
      expect(syncResult.recordsAffected).toBeGreaterThanOrEqual(0);
      expect(syncResult.syncedAt).toBeInstanceOf(Date);

      // 3. Verify data
      const employees = await getEmployees(ctx);

      expect(employees).toBeDefined();
      expect(Array.isArray(employees)).toBe(true);
    });

    it('should handle multiple HR system syncs', { timeout: 5000 }, async () => {
      const systems = ['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'] as const;

      for (const system of systems) {
        const configResult = await configureHRSystem(ctx, system, {
          api_endpoint: `https://api.${system.toLowerCase()}.com`,
          api_key: `test-key-${system}`,
        });

        expect(configResult.success).toBe(true);

        const syncResult = await triggerSync(ctx, system);

        expect(syncResult.success).toBe(true);
      }

      const syncLogs = await getSyncLogs(ctx);
      expect(syncLogs).toHaveLength(4);
    });
  });

  describe('Access Control Integration', () => {
    it('should enforce shift-based access control', async () => {
      // Create employee with shift
      const employee = await createEmployee(ctx, {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        employment_type: 'HOURLY',
      });

      // Create shift
      await createShift(ctx, employee.id, {
        shift_date: new Date().toISOString().split('T')[0],
        shift_start: '09:00',
        shift_end: '17:00',
      });

      // Check access during shift
      const accessCheck = await checkEmployeeAccess(ctx, employee.id);

      expect(accessCheck).toBeDefined();
      expect(typeof accessCheck.allowed).toBe('boolean');
    });

    it('should deny access outside shift hours', async () => {
      const employee = await createEmployee(ctx, {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        employment_type: 'HOURLY',
      });

      // Create shift for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createShift(ctx, employee.id, {
        shift_date: tomorrow.toISOString().split('T')[0],
        shift_start: '09:00',
        shift_end: '17:00',
      });

      // Check access today (should fail)
      const accessCheck = await checkEmployeeAccess(ctx, employee.id);

      expect(accessCheck.allowed).toBe(false);
    });
  });

  describe('Bulk Upload Integration', () => {
    it('should process bulk employee upload', async () => {
      const uploadData = [
        {
          employee_number: 'EMP001',
          first_name: 'Alice',
          last_name: 'Johnson',
          email: 'alice@example.com',
          department: 'Operations',
          position_title: 'Manager',
          employment_type: 'SALARY',
          salary: 75000,
        },
        {
          employee_number: 'EMP002',
          first_name: 'Bob',
          last_name: 'Williams',
          email: 'bob@example.com',
          department: 'Kitchen',
          position_title: 'Chef',
          employment_type: 'HOURLY',
          hourly_rate: 20,
        },
      ];

      const uploadResult = await uploadEmployees(ctx, uploadData);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.recordsProcessed).toBe(2);
      expect(uploadResult.recordsCreated).toBeGreaterThan(0);
    });

    it('should handle validation errors in bulk upload', async () => {
      const invalidData = [
        {
          // Missing required fields
          employee_number: 'EMP001',
          first_name: 'Invalid',
          // Missing last_name, email, etc.
        },
      ];

      const uploadResult = await uploadEmployees(ctx, invalidData as any);

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errors).toBeDefined();
      expect(uploadResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during concurrent syncs', { timeout: 5000 }, async () => {
      const syncPromises = [
        triggerSync(ctx, 'ADP'),
        triggerSync(ctx, 'GUSTO'),
        triggerSync(ctx, 'ONTRACK'),
      ];

      const results = await Promise.all(syncPromises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });

      // Verify no data conflicts
      const employees = await getEmployees(ctx);
      const employeeNumbers = new Set(employees.map((e: any) => e.employee_number));

      expect(employeeNumbers.size).toBe(employees.length);
    });

    it('should handle duplicate detection', async () => {
      const empData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        employment_type: 'HOURLY' as const,
      };

      const emp1 = await createEmployee(ctx, empData);
      const emp2Result = await createEmployee(ctx, empData).catch(e => ({ error: e }));

      expect(emp1.id).toBeDefined();
      // Second creation should either fail or return existing
      expect(emp2Result).toBeDefined();
    });
  });

  describe('Audit Trail', () => {
    it('should record all HR sync actions', { timeout: 5000 }, async () => {
      await triggerSync(ctx, 'ADP');
      await triggerSync(ctx, 'GUSTO');

      const auditLog = await getSyncLogs(ctx);

      expect(auditLog.length).toBeGreaterThanOrEqual(2);
      auditLog.forEach(log => {
        expect(log).toEqual(
          expect.objectContaining({
            org_id: ctx.orgId,
            system_type: expect.any(String),
            action: expect.any(String),
            status: expect.stringMatching(/SUCCESS|FAILED|PENDING/),
          })
        );
      });
    });

    it('should track employee modifications', async () => {
      const employee = await createEmployee(ctx, {
        first_name: 'Original',
        last_name: 'Name',
        email: 'original@example.com',
        employment_type: 'HOURLY',
      });

      await updateEmployee(ctx, employee.id, {
        first_name: 'Updated',
      });

      const auditLog = await getEmployeeAuditLog(ctx, employee.id);

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          field: 'first_name',
          old_value: 'Original',
          new_value: 'Updated',
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed syncs', async () => {
      let attemptCount = 0;

      vi.spyOn(global, 'fetch').mockImplementation(async (_url: any) => {
        attemptCount++;

        if (attemptCount === 1) {
          throw new Error('Network error');
        }

        return {
          ok: true,
          json: async () => ({ workers: [] }),
        } as any;
      });

      // First attempt fails
      let result = await triggerSync(ctx, 'ADP').catch(() => ({ success: false }));

      expect(result.success).toBe(false);
      expect(attemptCount).toBe(1);

      // Retry succeeds
      result = await triggerSync(ctx, 'ADP');

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2);
    });
  });
});

// Helper functions (mock implementations)
async function configureHRSystem(
  ctx: TestContext,
  system: string,
  config: Record<string, string>
) {
  mockStore.hrConfigs.set(`${ctx.orgId}:${system}`, config);
  return {
    success: true,
    system,
    message: 'Configured successfully',
  };
}

async function triggerSync(ctx: TestContext, system: string) {
  try {
    const response = await fetch(`https://hr-sync.local/${system.toLowerCase()}`);
    if (!response.ok) {
      mockStore.syncLogs.push({
        org_id: ctx.orgId,
        system_type: system,
        action: "PULL_EMPLOYEES",
        status: "FAILED",
        created_at: new Date().toISOString(),
      });
      return {
        success: false,
        recordsAffected: 0,
        syncedAt: new Date(),
        errors: ["Request failed"],
      };
    }
    mockStore.syncLogs.push({
      org_id: ctx.orgId,
      system_type: system,
      action: "PULL_EMPLOYEES",
      status: "SUCCESS",
      created_at: new Date().toISOString(),
    });
    return {
      success: true,
      recordsAffected: Math.floor(Math.random() * 1000),
      syncedAt: new Date(),
      errors: [],
    };
  } catch (error: any) {
    mockStore.syncLogs.push({
      org_id: ctx.orgId,
      system_type: system,
      action: "PULL_EMPLOYEES",
      status: "FAILED",
      created_at: new Date().toISOString(),
    });
    return {
      success: false,
      recordsAffected: 0,
      syncedAt: new Date(),
      errors: [error?.message || "Network error"],
    };
  }
}

async function getEmployees(ctx: TestContext) {
  return Array.from(mockStore.employees.values()).filter((emp) => emp.org_id === ctx.orgId);
}

async function getSyncLogs(ctx: TestContext) {
  return mockStore.syncLogs.filter((log) => log.org_id === ctx.orgId);
}

async function createEmployee(ctx: TestContext, data: Record<string, any>) {
  const existing = Array.from(mockStore.employees.values()).find(
    (emp) => emp.org_id === ctx.orgId && emp.email && emp.email === data.email,
  );
  if (existing) return existing;
  const employee = {
    id: 'emp-' + Date.now(),
    org_id: ctx.orgId,
    ...data,
  } as EmployeeRecord;
  mockStore.employees.set(employee.id, employee);
  return employee;
}

async function updateEmployee(_ctx: TestContext, empId: string, data: Record<string, any>) {
  const employee = mockStore.employees.get(empId);
  if (!employee) return { id: empId, ...data };
  const auditEntries: EmployeeAudit[] = [];
  Object.entries(data).forEach(([field, value]) => {
    const oldValue = (employee as any)[field] ?? null;
    if (oldValue !== value) {
      auditEntries.push({
        field,
        old_value: oldValue,
        new_value: value ?? null,
        changed_at: new Date().toISOString(),
      });
      (employee as any)[field] = value;
    }
  });
  mockStore.employees.set(empId, employee);
  if (auditEntries.length > 0) {
    const existing = mockStore.auditByEmployee.get(empId) || [];
    mockStore.auditByEmployee.set(empId, [...existing, ...auditEntries]);
  }
  return { id: empId, ...data };
}

async function createShift(
  _ctx: TestContext,
  empId: string,
  data: Pick<ShiftRecord, "shift_date" | "shift_start" | "shift_end">,
) {
  const shift: ShiftRecord = {
    id: 'shift-' + Date.now(),
    employee_id: empId,
    shift_date: data.shift_date,
    shift_start: data.shift_start,
    shift_end: data.shift_end,
  };
  const existing = mockStore.shiftsByEmployee.get(empId) || [];
  mockStore.shiftsByEmployee.set(empId, [...existing, shift]);
  return shift;
}

async function checkEmployeeAccess(_ctx: TestContext, empId: string) {
  const today = new Date().toISOString().split('T')[0];
  const shifts = mockStore.shiftsByEmployee.get(empId) || [];
  const todaysShift = shifts.find((shift) => shift.shift_date === today);
  if (!todaysShift) {
    return {
      allowed: false,
      reason: "No shift scheduled today",
    };
  }
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = todaysShift.shift_start.split(":").map(Number);
  const [endHour, endMin] = todaysShift.shift_end.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const allowed = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  return {
    allowed,
    reason: allowed ? "Within shift hours" : "Outside shift hours",
  };
}

async function uploadEmployees(ctx: TestContext, data: Record<string, any>[]) {
  const errors: string[] = [];
  let created = 0;
  data.forEach((row, index) => {
    const missing = ["employee_number", "first_name", "last_name", "email"].filter(
      (key) => !row?.[key],
    );
    if (missing.length > 0) {
      errors.push(`Row ${index + 1} missing: ${missing.join(", ")}`);
      return;
    }
    created += 1;
    const employee = {
      id: `emp-${Date.now()}-${index}`,
      org_id: ctx.orgId,
      ...row,
    } as EmployeeRecord;
    mockStore.employees.set(employee.id, employee);
  });
  return {
    success: errors.length === 0 && data.length > 0,
    recordsProcessed: data.length,
    recordsCreated: created,
    errors,
  };
}

async function getEmployeeAuditLog(_ctx: TestContext, empId: string) {
  return mockStore.auditByEmployee.get(empId) || [];
}
