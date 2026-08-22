export const ROLE_LABELS = {
  admin: 'Süper Admin',
  staff: 'Yetkili',
  customer: 'Müşteri',
} as const;

export type RoleName = keyof typeof ROLE_LABELS;

export function isRoleName(value: string): value is RoleName {
  return value === 'admin' || value === 'staff' || value === 'customer';
}

export function getRoleLabel(value: string) {
  return isRoleName(value) ? ROLE_LABELS[value] : 'Bilinmeyen Rol';
}

export function hasSuperAdminAccess(user: { is_super_admin?: boolean; role: string }) {
  return user.role === 'admin' || user.is_super_admin === true;
}
