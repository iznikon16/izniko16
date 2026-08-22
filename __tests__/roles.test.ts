import { getRoleLabel, hasSuperAdminAccess, isRoleName, ROLE_LABELS } from '@/lib/auth/roles';

describe('role mapping', () => {
  it('keeps backend role values stable and maps Turkish UI labels', () => {
    expect(ROLE_LABELS).toEqual({
      admin: 'Süper Admin',
      staff: 'Yetkili',
      customer: 'Müşteri',
    });
  });

  it('rejects invented backend roles', () => {
    expect(isRoleName('super_admin')).toBe(false);
    expect(getRoleLabel('super_admin')).toBe('Bilinmeyen Rol');
  });

  it('treats backend admin as Super Admin and preserves legacy flag compatibility', () => {
    expect(hasSuperAdminAccess({ role: 'admin' })).toBe(true);
    expect(hasSuperAdminAccess({ role: 'staff', is_super_admin: true })).toBe(true);
    expect(hasSuperAdminAccess({ role: 'staff' })).toBe(false);
  });
});
