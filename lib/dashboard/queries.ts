import { createAdminClient } from '@/lib/supabase/admin';
import type { PaymentRow, ProductRow } from '@/lib/catalog/types';

/**
 * Admin Dashboard için cari + stok metrikleri.
 */

export type DashboardAccountingMetrics = {
  totalReceivable: number;
  dueToday: number;
  overdueTotal: number;
  todayCollected: number;
  overdueCustomers: number;
  criticalStockCount: number;
  totalStockValue: number;
  customersNearRiskLimit: Array<{
    customerName: string;
    balance: number;
    riskLimit: number;
    usedPercent: number;
  }>;
};

function todayISOStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardAccountingMetrics(): Promise<DashboardAccountingMetrics> {
  const supabase = createAdminClient();

  const [summariesRes, dueRes, paymentsRes, productsRes] = await Promise.all([
    supabase.from('customer_account_summaries').select('customer_id, customer_name, balance, risk_limit'),
    supabase.from('customer_receivable_due_status').select('customer_id, remaining_amount, remaining_days, overdue_days'),
    supabase.from('payments').select('*').eq('status', 'completed').gte('paid_at', todayISOStart()),
    supabase.from('products').select('id, title, stock_quantity, critical_stock'),
  ]);

  if (summariesRes.error) throw new Error(summariesRes.error.message);
  if (dueRes.error) throw new Error(dueRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const products = (productsRes.data ?? []) as Pick<ProductRow, 'id' | 'title' | 'stock_quantity' | 'critical_stock'>[];

  const summaries = summariesRes.data ?? [];
  const dueReceivables = dueRes.data ?? [];
  let dueToday = 0;
  let overdueTotal = 0;
  const overdueCustomerIds = new Set<string>();
  for (const receivable of dueReceivables) {
    const remaining = Number(receivable.remaining_amount) || 0;
    const overdueDays = Number(receivable.overdue_days) || 0;
    const remainingDays = Number(receivable.remaining_days) || 0;
    if (remaining <= 0) continue;
    if (overdueDays > 0) {
      overdueTotal += remaining;
      if (receivable.customer_id) overdueCustomerIds.add(receivable.customer_id);
    } else if (remainingDays === 0) {
      dueToday += remaining;
    }
  }

  const totalReceivable = summaries.reduce((sum, summary) => sum + Math.max(0, Number(summary.balance) || 0), 0);
  const todayCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const overdueCustomers = overdueCustomerIds.size;

  // Kritik stok
  const criticalStockCount = products.filter((p) => Number(p.stock_quantity) <= Number(p.critical_stock)).length;

  // Müşteri bazında risk limiti yaklaşanlar
  const customersNearRiskLimit: DashboardAccountingMetrics['customersNearRiskLimit'] = [];
  for (const summary of summaries) {
    const riskLimit = Number(summary.risk_limit) || 0;
    if (riskLimit <= 0) continue;
    const balance = Number(summary.balance) || 0;
    const usedPercent = Math.min(100, Math.round((balance / riskLimit) * 100));
    if (usedPercent >= 70) {
      customersNearRiskLimit.push({
        customerName: summary.customer_name || summary.customer_id || 'Bilinmeyen müşteri',
        balance,
        riskLimit,
        usedPercent,
      });
    }
  }
  customersNearRiskLimit.sort((a, b) => b.usedPercent - a.usedPercent);

  // Stok toplam değeri (yaklaşık)
  const priceRes = await supabase.from('products').select('price, stock_quantity');
  const totalStockValue = ((priceRes.data ?? []) as Array<{ price: number | null; stock_quantity: number }>).reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock_quantity) || 0),
    0
  );

  return {
    totalReceivable,
    dueToday,
    overdueTotal,
    todayCollected,
    overdueCustomers,
    criticalStockCount,
    totalStockValue,
    customersNearRiskLimit: customersNearRiskLimit.slice(0, 5),
  };
}

export type OrderTrendPoint = {
  label: string;
  count: number;
  total: number;
};

export async function getOrderTrend(days: number): Promise<OrderTrendPoint[]> {
  const supabase = createAdminClient();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', from.toISOString());

  if (error) throw new Error(error.message);

  const buckets = new Map<string, { count: number; total: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { count: 0, total: 0 });
  }

  for (const order of data ?? []) {
    const key = order.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.total += Number(order.total) || 0;
    }
  }

  return [...buckets.entries()].map(([date, { count, total }]) => ({
    label: new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    count,
    total,
  }));
}

export async function getRecentOrders(limit: number = 5) {
  const supabase = createAdminClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at, order_number, user_id, payment_method_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  if (!orders || orders.length === 0) return [];

  const userIds = [...new Set(orders.map((o) => o.user_id))];
  const paymentMethodIds = [...new Set(orders.map((o) => o.payment_method_id).filter(Boolean))] as string[];

  const [profilesRes, paymentMethodsRes] = await Promise.all([
    supabase.from('customer_profiles').select('user_id, full_name, email').in('user_id', userIds),
    paymentMethodIds.length > 0 
      ? supabase.from('payment_methods').select('id, name').in('id', paymentMethodIds)
      : Promise.resolve({ data: [] })
  ]);

  const profilesById = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const methodsById = new Map((paymentMethodsRes.data ?? []).map((m) => [m.id, m]));

  return orders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    total: order.total,
    status: order.status,
    created_at: order.created_at,
    customerName: profilesById.get(order.user_id)?.full_name || profilesById.get(order.user_id)?.email || 'Bilinmeyen Müşteri',
    paymentMethod: order.payment_method_id ? methodsById.get(order.payment_method_id)?.name : 'Bilinmiyor',
  }));
}

export type AccountingTrendPoint = {
  label: string;
  tahsilat: number;
  yeniBorc: number;
};

export async function getAccountingTrend(days: number): Promise<AccountingTrendPoint[]> {
  const supabase = createAdminClient();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const [txsRes, paymentsRes] = await Promise.all([
    supabase.from('account_transactions').select('debit, created_at').gte('created_at', from.toISOString()),
    supabase.from('payments').select('amount, paid_at').eq('status', 'completed').gte('paid_at', from.toISOString()),
  ]);

  if (txsRes.error) throw new Error(txsRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const buckets = new Map<string, { tahsilat: number; yeniBorc: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { tahsilat: 0, yeniBorc: 0 });
  }

  for (const tx of txsRes.data ?? []) {
    const key = tx.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket && tx.debit) {
      bucket.yeniBorc += Number(tx.debit) || 0;
    }
  }

  for (const payment of paymentsRes.data ?? []) {
    const key = (payment.paid_at || '').slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket && payment.amount) {
      bucket.tahsilat += Number(payment.amount) || 0;
    }
  }

  return [...buckets.entries()].map(([date, { tahsilat, yeniBorc }]) => ({
    label: new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    tahsilat,
    yeniBorc,
  }));
}
