
/**
 * RBAC — permission bazlı yetki kontrolü.
 * Roller: admin | staff | customer. admin_users.role üzerinden çalışır.
 *
 * Not: Gerçek DB izin tabloları (roles/permissions/role_permissions) migration
 * 12'de tanımlandı. Bu yardımcılar, supabase ve service-role kullanımı için
 * rol bazlı hızlı kontrol sağlar. İleri düzey izinler DB'den de sorgulanabilir.
 */

export type RoleName = 'admin' | 'staff' | 'customer';

/** Rollerin sahip olduğu izin setleri (basit, okunabilir yapı) */
const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  admin: [
    '*', // tümü
  ],
  staff: [
    'user.view',
    'customer.view',
    'customer.create',
    'customer.update',
    'product.view',
    'product.create',
    'product.update',
    'product.managePrice',
    'product.manageStock',
    'order.view',
    'order.changeStatus',
    'order.cancel',
    'order.print',
    'return.view',
    'return.manage',
    'invoice.view',
    'invoice.manage',
    'account.view',
    'account.createTransaction',
    'account.collectPayment',
    'account.editDueDate',
    'account.viewStatement',
    'account.exportStatement',
    'xml.view',
    'xml.create',
    'xml.sync',
    'report.view',
    'report.export',
    'marketing.manage',
  ],
  customer: [
    'customer.viewSelf',
    'account.viewSelf',
    'order.create',
    'order.viewSelf',
  ],
};

export class PermissionError extends Error {
  constructor(permission: string) {
    super(`Bu işlem için yetkiniz yok (${permission}).`);
    this.name = 'PermissionError';
  }
}

export function roleHasPermission(role: string | undefined, permission: string): boolean {
  const normalized = (role ?? 'customer') as RoleName;
  const list = ROLE_PERMISSIONS[normalized] ?? [];
  return list.includes('*') || list.includes(permission);
}

/**
 * Server action / route içinde yetki kontrolü.
 * @returns true ise izin var; yoksa PermissionError fırlatır.
 */
export function assertPermission(role: string | undefined, permission: string): boolean {
  if (roleHasPermission(role, permission)) {
    return true;
  }
  throw new PermissionError(permission);
}

/**
 * Müşteri kendi kaynağına erişiyor mu kontrolü (IDOR koruması).
 */
export function assertOwnership<T = string>(requestedOwnerId: T, sessionOwnerId: T) {
  if (String(requestedOwnerId) !== String(sessionOwnerId)) {
    throw new PermissionError('Erişim reddedildi');
  }
}

// Kullanılabilir izin anahtarları (dokümantasyon/UI için)
export const PERMISSIONS = {
  userView: 'user.view',
  userCreate: 'user.create',
  userDisable: 'user.disable',
  customerView: 'customer.view',
  customerManagePricing: 'customer.managePricing',
  productManagePrice: 'product.managePrice',
  productManageStock: 'product.manageStock',
  orderView: 'order.view',
  orderChangeStatus: 'order.changeStatus',
  orderCancel: 'order.cancel',
  returnView: 'return.view',
  returnManage: 'return.manage',
  invoiceView: 'invoice.view',
  invoiceManage: 'invoice.manage',
  accountView: 'account.view',
  accountCreateTransaction: 'account.createTransaction',
  accountCollectPayment: 'account.collectPayment',
  accountEditDueDate: 'account.editDueDate',
  accountReverseTransaction: 'account.reverseTransaction',
  accountViewStatement: 'account.viewStatement',
  accountExportStatement: 'account.exportStatement',
  accountManageRiskLimit: 'account.manageRiskLimit',
  accountSendPaymentReminder: 'account.sendPaymentReminder',
  xmlSync: 'xml.sync',
  reportView: 'report.view',
  reportExport: 'report.export',
  settingsView: 'settings.view',
  settingsManageIntegrations: 'settings.manageIntegrations',
  marketingManage: 'marketing.manage',
  auditView: 'audit.view',
} as const;

export type { RoleName as RbacRoleName };
