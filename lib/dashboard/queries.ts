import 'server-only';

import { getAuditActionLabel, getAuditLogs } from '@/lib/audit/queries';
import type { PaymentRow, ProductRow } from '@/lib/catalog/types';
import type { DashboardDateRange } from '@/lib/dashboard/filters';
import { getIstanbulTodayBounds, toIstanbulDateKey } from '@/lib/dashboard/filters';
import { getLatestIntegrationChecks, type IntegrationStatus } from '@/lib/integrations/health';
import { createAdminClient } from '@/lib/supabase/admin';

export type DashboardAccountingMetrics = {
  totalReceivable: number;
  dueToday: number;
  overdueTotal: number;
  todayCollected: number;
  overdueCustomers: number;
  criticalStockCount: number;
  totalStockValue: number;
  customersNearRiskLimit: Array<{
    customerId: string;
    customerName: string;
    balance: number;
    riskLimit: number;
    usedPercent: number;
  }>;
};

export async function getDashboardAccountingMetrics(): Promise<DashboardAccountingMetrics> {
  const supabase = createAdminClient();
  const today = toIstanbulDateKey(new Date());
  const bounds = getIstanbulTodayBounds();
  const [summaries, receivables, payments, products] = await Promise.all([
    supabase.from('customer_account_summaries').select('customer_id, customer_name, balance, risk_limit, available_limit'),
    supabase.from('customer_receivable_due_status').select('customer_id, remaining_amount, due_date, overdue_days'),
    supabase.from('payments').select('*').eq('status', 'completed').gte('paid_at', bounds.fromInclusive).lt('paid_at', bounds.toExclusive),
    supabase.from('products').select('id, title, stock_quantity, critical_stock, price'),
  ]);
  const error = [summaries.error, receivables.error, payments.error, products.error].find(Boolean);
  if (error) throw new Error(error.message);

  let dueToday = 0;
  let overdueTotal = 0;
  const overdueCustomerIds = new Set<string>();
  for (const receivable of receivables.data ?? []) {
    const remaining = Number(receivable.remaining_amount) || 0;
    if (remaining <= 0) continue;
    if ((Number(receivable.overdue_days) || 0) > 0) {
      overdueTotal += remaining;
      if (receivable.customer_id) overdueCustomerIds.add(receivable.customer_id);
    } else if (receivable.due_date === today) {
      dueToday += remaining;
    }
  }

  const customersNearRiskLimit: DashboardAccountingMetrics['customersNearRiskLimit'] = [];
  for (const summary of summaries.data ?? []) {
    const riskLimit = Number(summary.risk_limit) || 0;
    if (riskLimit <= 0 || !summary.customer_id) continue;
    const usedLimit = Math.max(0, riskLimit - (Number(summary.available_limit) || 0));
    const usedPercent = Math.min(100, Math.round((usedLimit / riskLimit) * 100));
    if (usedPercent >= 70) {
      customersNearRiskLimit.push({
        customerId: summary.customer_id,
        customerName: summary.customer_name || summary.customer_id,
        balance: Number(summary.balance) || 0,
        riskLimit,
        usedPercent,
      });
    }
  }
  customersNearRiskLimit.sort((left, right) => right.usedPercent - left.usedPercent);

  const paymentRows = (payments.data ?? []) as PaymentRow[];
  const productRows = (products.data ?? []) as Pick<ProductRow, 'id' | 'title' | 'stock_quantity' | 'critical_stock' | 'price'>[];
  return {
    totalReceivable: (summaries.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.balance) || 0), 0),
    dueToday,
    overdueTotal,
    todayCollected: paymentRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    overdueCustomers: overdueCustomerIds.size,
    criticalStockCount: productRows.filter((row) => Number(row.stock_quantity) <= Number(row.critical_stock)).length,
    totalStockValue: productRows.reduce((sum, row) => sum + (Number(row.price) || 0) * (Number(row.stock_quantity) || 0), 0),
    customersNearRiskLimit: customersNearRiskLimit.slice(0, 5),
  };
}

export type OrderTrendPoint = { label: string; count: number; total: number };
export type AccountingTrendPoint = { label: string; tahsilat: number; yeniBorc: number };

function createDateBuckets<T>(range: DashboardDateRange, value: () => T) {
  const buckets = new Map<string, T>();
  for (let index = 0; index < range.days; index += 1) {
    const date = new Date(`${range.fromDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    buckets.set(date.toISOString().slice(0, 10), value());
  }
  return buckets;
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Istanbul',
  });
}

export async function getOrderTrend(range: DashboardDateRange): Promise<OrderTrendPoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('total, created_at')
    .gte('created_at', range.fromInclusive).lt('created_at', range.toExclusive);
  if (error) throw new Error(error.message);
  const buckets = createDateBuckets(range, () => ({ count: 0, total: 0 }));
  for (const order of data ?? []) {
    const bucket = buckets.get(toIstanbulDateKey(new Date(order.created_at)));
    if (bucket) {
      bucket.count += 1;
      bucket.total += Number(order.total) || 0;
    }
  }
  return [...buckets].map(([date, value]) => ({ label: dateLabel(date), ...value }));
}

export async function getAccountingTrend(range: DashboardDateRange): Promise<AccountingTrendPoint[]> {
  const supabase = createAdminClient();
  const [transactions, payments] = await Promise.all([
    supabase.from('account_transactions').select('debit, created_at').gte('created_at', range.fromInclusive).lt('created_at', range.toExclusive),
    supabase.from('payments').select('amount, paid_at').eq('status', 'completed').gte('paid_at', range.fromInclusive).lt('paid_at', range.toExclusive),
  ]);
  if (transactions.error) throw new Error(transactions.error.message);
  if (payments.error) throw new Error(payments.error.message);
  const buckets = createDateBuckets(range, () => ({ tahsilat: 0, yeniBorc: 0 }));
  for (const transaction of transactions.data ?? []) {
    const bucket = buckets.get(toIstanbulDateKey(new Date(transaction.created_at)));
    if (bucket) bucket.yeniBorc += Number(transaction.debit) || 0;
  }
  for (const payment of payments.data ?? []) {
    const bucket = buckets.get(toIstanbulDateKey(new Date(payment.paid_at)));
    if (bucket) bucket.tahsilat += Number(payment.amount) || 0;
  }
  return [...buckets].map(([date, value]) => ({ label: dateLabel(date), ...value }));
}

export async function getRecentOrders(limit = 5) {
  const supabase = createAdminClient();
  const { data: orders, error } = await supabase.from('orders')
    .select('id, total, status, payment_status, created_at, order_number, user_id, customer_name, customer_email, payment_method_id')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  if (!orders?.length) return [];
  const userIds = [...new Set(orders.map((order) => order.user_id))];
  const methodIds = [...new Set(orders.map((order) => order.payment_method_id).filter(Boolean))] as string[];
  const profiles = await supabase.from('customer_profiles').select('user_id, full_name, email').in('user_id', userIds);
  const methods = methodIds.length
    ? await supabase.from('payment_methods').select('id, name').in('id', methodIds)
    : { data: [] as Array<{ id: string; name: string }>, error: null };
  if (profiles.error || methods.error) throw new Error('Son sipariş bilgileri alınamadı.');
  const profileMap = new Map((profiles.data ?? []).map((row) => [row.user_id, row]));
  const methodMap = new Map((methods.data ?? []).map((row) => [row.id, row.name]));
  return orders.map((order) => ({
    ...order,
    customerName: order.customer_name || profileMap.get(order.user_id)?.full_name || order.customer_email || profileMap.get(order.user_id)?.email || 'Bilinmeyen müşteri',
    paymentMethod: order.payment_method_id ? methodMap.get(order.payment_method_id) || 'Bilinmiyor' : 'Bilinmiyor',
  }));
}

export type DashboardHealthItem = {
  key: string;
  label: string;
  status: IntegrationStatus;
  message: string;
  href: string;
};

export async function getDashboardIntegrationHealth(): Promise<DashboardHealthItem[]> {
  const supabase = createAdminClient();
  const [latest, xml] = await Promise.all([
    getLatestIntegrationChecks(),
    supabase.from('xml_sources').select('last_status').eq('is_active', true),
  ]);
  if (xml.error) throw new Error('XML sağlık durumu alınamadı.');
  const sources = xml.data ?? [];
  const checkItem = (key: 'netgsm' | 'smtp' | 'odeal', label: string, href: string): DashboardHealthItem => {
    const check = latest.get(key);
    const status = check?.status;
    const normalizedStatus: IntegrationStatus = status === 'ready' || status === 'success' || status === 'failed'
      ? status
      : 'not_configured';
    return {
      key,
      label,
      href,
      status: normalizedStatus,
      message: check?.message || 'Henüz kontrol edilmedi.',
    };
  };
  return [
    { key: 'supabase', label: 'Supabase', href: '/admin/integrations', status: 'success', message: 'Veritabanı sorguları çalışıyor.' },
    {
      key: 'xml',
      label: 'XML',
      href: '/admin/integrations/xml',
      status: sources.some((row) => row.last_status === 'error') ? 'failed' : sources.length ? 'ready' : 'not_configured',
      message: sources.length ? `${sources.length} aktif kaynak` : 'Aktif kaynak yok.',
    },
    checkItem('netgsm', 'Netgsm', '/admin/integrations/netgsm'),
    checkItem('smtp', 'SMTP', '/admin/mail'),
    checkItem('odeal', 'Ödeal', '/admin/integrations/odeal'),
  ];
}

export async function getDashboardActivities(limit = 6) {
  const logs = await getAuditLogs(Math.max(30, limit));
  return logs.filter((log) => !['login_failure', 'login_success'].includes(log.action)).slice(0, limit).map((log) => ({
    id: log.id,
    label: getAuditActionLabel(log.action),
    resourceType: log.resource_type,
    createdAt: log.created_at,
  }));
}
