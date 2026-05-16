import { describe, it, expect } from 'vitest';
import { RBAC as rbac } from '../RBAC';

describe('RBAC', () => {
  it('should allow admin all permissions', () => {
    expect(rbac.can('admin', 'any_permission')).toBe(true);
  });
  it('should deny staff editing orders', () => {
    expect(rbac.can('staff', 'edit_orders')).toBe(false);
  });
});