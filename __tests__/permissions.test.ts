import { PermissionError, assertPermission, roleHasPermission } from '@/lib/auth/permissions';

describe('RBAC permissions', () => {
  it('allows admin for every permission', () => {
    expect(roleHasPermission('admin', 'account.manageRiskLimit')).toBe(true);
    expect(roleHasPermission('admin', 'account.reverseTransaction')).toBe(true);
  });

  it('allows staff only for explicitly assigned accounting permissions', () => {
    expect(roleHasPermission('staff', 'account.view')).toBe(true);
    expect(roleHasPermission('staff', 'account.collectPayment')).toBe(true);
    expect(roleHasPermission('staff', 'account.manageRiskLimit')).toBe(false);
    expect(roleHasPermission('staff', 'account.reverseTransaction')).toBe(false);
  });

  it('does not allow customer role to call admin accounting mutations', () => {
    expect(roleHasPermission('customer', 'account.viewSelf')).toBe(true);
    expect(() => assertPermission('customer', 'account.collectPayment')).toThrow(PermissionError);
  });

  it('fails closed for an unknown role', () => {
    expect(roleHasPermission('unknown', 'account.view')).toBe(false);
  });
});
