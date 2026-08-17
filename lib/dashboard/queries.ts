import { createAdminClient } from '@/lib/supabase/admin';
import type { AccountTransactionRow, CustomerAccountRow, CustomerProfileRow, PaymentRow, ProductRow } from '@/lib/catalog/types';
import { summarizeTransactions } from '@/lib/accounting/queries';

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

export async function getDashboardAccountingMetrics(days?: number): Promise<DashboardAccountingMetrics> {
  const supabase = createAdminClient();

  const [accountsRes, txsRes, paymentsRes, productsRes] = await Promise.all([
    supabase.from('customer_accounts').select('*'),
    supabase.from('account_transactions').select('*'),
    supabase.from('payments').select('*').eq('status', 'completed').gte('paid_at', todayISOStart()),
    supabase.from('products').select('id, title, stock_quantity, critical_stock'),
  ]);

  if (accountsRes.error) throw new Error(accountsRes.error.message);
  if (txsRes.error) throw new Error(txsRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const products = (productsRes.data ?? []) as Pick<ProductRow, 'id' | 'title' | 'stock_quantity' | 'critical_stock'>[];

  // Toplam alacak: tüm ledger'ı grupla
  const txs = (txsRes.data ?? []) as AccountTransactionRow[];
  let totalDebit = 0;
  let totalCredit = 0;
  let dueToday = 0;
  let overdueTotal = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);

  for (const tx of txs) {
    totalDebit += Number(tx.debit) || 0;
    totalCredit += Number(tx.credit) || 0;
    const open = (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
    if (open > 0 && tx.due_date) {
      if (tx.due_date === todayISO) dueToday += open;
      else if (tx.due_date < todayISO) overdueTotal += open;
    }
  }

  const totalReceivable = Math.max(0, totalDebit - totalCredit);
  const todayCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Vadesi geçen müşteri sayısı
  const overdueCustomers = txs.reduce((set, tx) => {
    const open = (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
    if (open > 0 && tx.due_date && tx.due_date < todayISO) {
      set.add(tx.customer_id);
    }
    return set;
  }, new Set<string>()).size;

  // Kritik stok
  const criticalStockCount = products.filter((p) => Number(p.stock_quantity) <= Number(p.critical_stock)).length;

  // Müşteri bazında risk limiti yaklaşanlar
  const accounts = accountsRes.data ?? [];
  const txsByCustomer = new Map<string, AccountTransactionRow[]>();
  for (const tx of txs) {
    const list = txsByCustomer.get(tx.customer_id) ?? [];
    list.push(tx);
    txsByCustomer.set(tx.customer_id, list);
  }
  const accountsById = new Map((accounts as CustomerAccountRow[]).map((a) => [a.customer_id, a]));
  const profilesRes = await supabase.from('customer_profiles').select('user_id, full_name, email, is_vip, phone, is_blocked');
  const profilesById = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p as CustomerProfileRow]));

  const customersNearRiskLimit: DashboardAccountingMetrics['customersNearRiskLimit'] = [];
  for (const [customerId, customerTxs] of txsByCustomer) {
    const account = accountsById.get(customerId) as CustomerAccountRow | undefined;
    if (!account) continue;
    const riskLimit = Number(account.risk_limit) || 0;
    if (riskLimit <= 0) continue;
    const summary = summarizeTransactions(customerTxs, account);
    const balance = summary.balance;
    const usedPercent = Math.min(100, Math.round((balance / riskLimit) * 100));
    if (usedPercent >= 70) {
      const profile = profilesById.get(customerId);
      customersNearRiskLimit.push({
        customerName: profile?.full_name || profile?.email || customerId,
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
