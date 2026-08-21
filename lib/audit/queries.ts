import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditLogRow } from '@/lib/catalog/types';

/**
 * Audit log servisi. Kritik işlemlerde çağrılır.
 */

export async function writeAuditLog({
  actorUserId,
  action,
  resourceType,
  resourceId = '',
  oldValue = {},
  newValue = {},
  metadata = {},
  ip = '',
}: {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: actorUserId ?? null,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    old_value: oldValue as never,
    new_value: newValue as never,
    metadata: metadata as never,
    ip_address: ip,
  });

  if (error) {
    // Audit başarısız olsa ana işlemi bozmamak için sadece logla
    console.error('Audit log yazılamadı:', error.message);
  }
}

export async function getAuditLogs(limit = 200): Promise<AuditLogRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogRow[];
}

const ACTION_LABELS: Record<string, string> = {
  account_transaction_create: 'Cari Hareket Oluşturma',
  payment_create: 'Tahsilat Girişi',
  payment_reverse: 'Tahsilat İptali',
  order_post_to_account: 'Sipariş → Cari',
  order_cancel: 'Sipariş İptali',
  risk_limit_update: 'Risk Limiti Güncelleme',
  stock_change: 'Stok Değişimi',
  xml_sync: 'XML Senkronizasyonu',
  settings_update: 'Ayarlar Güncelleme',
  customer_update: 'Müşteri Güncelleme',
  managed_user_create: 'Kullanıcı Oluşturma',
  managed_user_update: 'Kullanıcı ve Rol Güncelleme',
  managed_user_password_change: 'Kullanıcı Şifresi Değiştirme',
  managed_user_delete: 'Kullanıcı Silme',
};

export function getAuditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}
