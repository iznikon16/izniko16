import 'server-only';

import type { Json } from '@/lib/supabase/database.types';
import type { AuditLogRow } from '@/lib/catalog/types';
import { sanitizeAuditRecord } from '@/lib/audit/sanitize';
import { createAdminClient } from '@/lib/supabase/admin';

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
    action: action.slice(0, 160),
    resource_type: resourceType.slice(0, 120),
    resource_id: resourceId.slice(0, 500),
    old_value: sanitizeAuditRecord(oldValue) as Json,
    new_value: sanitizeAuditRecord(newValue) as Json,
    metadata: sanitizeAuditRecord(metadata) as Json,
    ip_address: ip.slice(0, 64),
  });
  if (error) console.error('Audit log yazılamadı:', error.message);
}

export type AuditLogFilters = {
  action?: string;
  resourceType?: string;
  query?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  state?: 'active' | 'deleted' | 'all';
};

export type EnrichedAuditLog = AuditLogRow & {
  actorName: string;
  actorEmail: string;
  actorRole: string;
};

function safeFilterTerm(value: string) {
  return value.replace(/[%_,().]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function isMissingRetentionColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === '42703' || error.message?.includes('audit_logs.deleted_at')));
}

export async function queryAuditLogs(filters: AuditLogFilters = {}) {
  const supabase = createAdminClient();
  const pageSize = Math.min(100, Math.max(10, Math.trunc(filters.pageSize ?? 25)));
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const start = (page - 1) * pageSize;
  const term = safeFilterTerm(filters.query ?? '');
  function buildQuery(includeRetentionFilter: boolean) {
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (includeRetentionFilter) {
      if (filters.state === 'deleted') query = query.not('deleted_at', 'is', null);
      else if (filters.state !== 'all') query = query.is('deleted_at', null);
    }
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00+03:00`);
    if (filters.to) {
      const nextDay = new Date(`${filters.to}T12:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query = query.lt('created_at', `${nextDay.toISOString().slice(0, 10)}T00:00:00+03:00`);
    }
    if (term) query = query.or(`action.ilike.%${term}%,resource_type.ilike.%${term}%,resource_id.ilike.%${term}%`);
    return query.order('created_at', { ascending: false }).range(start, start + pageSize - 1);
  }

  let response = await buildQuery(true);
  let retentionAvailable = true;
  if (isMissingRetentionColumn(response.error)) {
    retentionAvailable = false;
    response = await buildQuery(false);
  }
  const { data, error, count } = response;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditLogRow[];
  const actorIds = [...new Set(rows.flatMap((row) => row.actor_user_id ? [row.actor_user_id] : []))];
  const [admins, customers] = actorIds.length ? await Promise.all([
    supabase.from('admin_users').select('user_id, full_name, email, role').in('user_id', actorIds),
    supabase.from('customer_profiles').select('user_id, full_name, email').in('user_id', actorIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (admins.error || customers.error) throw new Error('Aktör bilgileri alınamadı.');
  const adminMap = new Map((admins.data ?? []).map((actor) => [actor.user_id, actor]));
  const customerMap = new Map((customers.data ?? []).map((actor) => [actor.user_id, actor]));
  const enriched: EnrichedAuditLog[] = rows.map((row) => {
    const admin = row.actor_user_id ? adminMap.get(row.actor_user_id) : undefined;
    const customer = row.actor_user_id ? customerMap.get(row.actor_user_id) : undefined;
    return {
      ...row,
      deleted_at: row.deleted_at ?? null,
      deleted_by: row.deleted_by ?? null,
      deletion_reason: row.deletion_reason ?? '',
      actorName: admin?.full_name || customer?.full_name || (row.actor_user_id ? 'Silinmiş kullanıcı' : 'Sistem'),
      actorEmail: admin?.email || customer?.email || '',
      actorRole: admin?.role || (customer ? 'customer' : 'system'),
    };
  });
  return { rows: enriched, count: count ?? 0, page, pageSize, pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)), retentionAvailable };
}

export async function getAuditFilterOptions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('audit_logs').select('action, resource_type').order('created_at', { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return {
    actions: [...new Set((data ?? []).map((row) => row.action))].sort((a, b) => a.localeCompare(b, 'tr')),
    resourceTypes: [...new Set((data ?? []).map((row) => row.resource_type))].sort((a, b) => a.localeCompare(b, 'tr')),
  };
}

export async function getAuditLogs(limit = 200): Promise<AuditLogRow[]> {
  const result = await queryAuditLogs({ pageSize: Math.min(100, limit) });
  if (limit <= 100) return result.rows;
  const supabase = createAdminClient();
  let response = await supabase.from('audit_logs').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(limit);
  if (isMissingRetentionColumn(response.error)) {
    response = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  }
  const { data, error } = response;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, deleted_at: row.deleted_at ?? null, deleted_by: row.deleted_by ?? null, deletion_reason: row.deletion_reason ?? '' })) as AuditLogRow[];
}

const ACTION_LABELS: Record<string, string> = {
  account_transaction_create: 'Cari hareket oluşturma',
  account_transaction_created: 'Cari hareket oluşturma',
  account_due_date_changed: 'Vade tarihi değiştirme',
  customer_payment_terms_updated: 'Ödeme vadesi güncelleme',
  customer_risk_settings_updated: 'Risk ayarları güncelleme',
  payment_create: 'Tahsilat girişi',
  payment_collected: 'Tahsilat girişi',
  payment_reverse: 'Tahsilat iptali',
  payment_reversed: 'Tahsilat iptali',
  order_post_to_account: 'Sipariş → cari',
  order_cancel: 'Sipariş iptali',
  order_updated: 'Sipariş güncelleme',
  product_created: 'Ürün oluşturma',
  product_updated: 'Ürün güncelleme',
  product_deleted: 'Ürün silme',
  product_min_order_changed: 'Minimum sipariş adedi değiştirme',
  customer_update: 'Müşteri güncelleme',
  stock_change: 'Stok değişimi',
  stock_critical_level_updated: 'Kritik stok seviyesi güncelleme',
  xml_source_created: 'XML kaynağı oluşturma',
  xml_source_updated: 'XML kaynağı güncelleme',
  xml_source_deleted: 'XML kaynağı silme',
  xml_sync: 'XML senkronizasyonu',
  settings_update: 'Ayar güncelleme',
  managed_user_create: 'Kullanıcı oluşturma',
  managed_user_update: 'Kullanıcı ve rol güncelleme',
  managed_user_password_change: 'Kullanıcı şifresi değiştirme',
  managed_user_delete: 'Kullanıcı silme',
  integration_payment_method_create: 'Ödeme yöntemi oluşturma',
  integration_payment_method_update: 'Ödeme yöntemi güncelleme',
  integration_payment_method_delete: 'Ödeme yöntemi silme',
  audit_log_hidden: 'Audit kaydını gizleme',
  audit_log_restored: 'Audit kaydını geri yükleme',
  audit_logs_permanently_deleted: 'Audit kayıtlarını kalıcı silme',
  'invoice.issued': 'Fatura oluşturma',
  'invoice.cancellation': 'Fatura iptal belgesi',
  'invoice.refund': 'Fatura iade belgesi',
  'invoice.provider_send': 'e-Fatura gönderim hazırlığı',
  'invoice.provider_cancel': 'e-Fatura iptal hazırlığı',
  order_document_created: 'Sipariş satış belgesi oluşturma',
};

export function getAuditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');
}

export function getAuditResourceLabel(resourceType: string) {
  const labels: Record<string, string> = {
    account_transaction: 'Cari hareket', customer_account: 'Cari hesap', payment: 'Tahsilat', order: 'Sipariş',
    product: 'Ürün', stock: 'Stok', user: 'Kullanıcı', customer: 'Müşteri', integration: 'Entegrasyon',
    xml_source: 'XML kaynağı', payment_method: 'Ödeme yöntemi', invoice: 'Fatura', auth: 'Oturum',
  };
  return labels[resourceType] ?? resourceType.replace(/[._]/g, ' ');
}
