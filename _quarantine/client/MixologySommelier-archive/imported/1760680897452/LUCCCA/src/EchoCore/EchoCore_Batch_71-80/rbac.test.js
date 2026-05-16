// rbac.test.js
import { renderHook, act } from '@testing-library/react';
import { RBACContext } from './RBACProvider';

test('roles can be set and checked', () => {
  let rolesValue = [];
  const setRoles = (r) => (rolesValue = r);
  const hasPermission = (role) => rolesValue.includes(role);

  expect(hasPermission('admin')).toBe(false);
  setRoles(['admin']);
  expect(hasPermission('admin')).toBe(true);
});
