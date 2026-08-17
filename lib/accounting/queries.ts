import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AccountStatement,
  AccountStatementLine,
  CustomerAccountSummary,
  OverduePayment,
} from '@/lib/accounting/types';
import type { AccountTransactionRow, CustomerAccountRow, CustomerProfileRow, OrderRow, PaymentRow } from '@/lib/catalog/types';

type CustomerId = string;

/**
 * Yardımcılar — finansal hesaplamalar (kuruş hassasiyeti için rounding)
 */
export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/**
 * Ledger'ı açık bakiye özetine çevirir. Mutasyon yapmaz — salt okuma.
 */
export function summarizeTransactions(transactions: AccountTransactionRow[], account: CustomerAccountRow | null): CustomerAccountSummary {
  const now = new Date();
  const today = startOfDay(now);
  let totalDebit = 0;
  let totalCredit = 0;
  let balance = 0;
  let overdueBalance = 0;
  let dueToday = 0;
  let lastTransactionAt: string | null = null;
  let lastPaymentAt: string | null = null;

  for (const tx of transactions) {
    const debit = Number(tx.debit) || 0;
    const credit = Number(tx.credit) || 0;
    totalDebit += debit;
    totalCredit += credit;
    balance += debit - credit;

    if (tx.created_at && (!lastTransactionAt || tx.created_at > lastTransactionAt)) {
      lastTransactionAt = tx.created_at;
    }

    if (tx.type === 'PAYMENT' || tx.type === 'PARTIAL_PAYMENT') {
      if (tx.created_at && (!lastPaymentAt || tx.created_at > lastPaymentAt)) {
        lastPaymentAt = tx.created_at;
      }
    }

    // Vade analizi — yalnızca açık bakiye bırakan hareketler
    const openAmount = debit - credit;
    if (openAmount > 0 && tx.due_date) {
      const dueDate = startOfDay(new Date(`${tx.due_date}T00:00:00`));
      const diff = daysBetween(dueDate, now);

      if (diff > 0) {
        overdueBalance += openAmount;
      } else if (dueDate.getTime() === today.getTime()) {
        dueToday += openAmount;
      }
    }
  }

  const riskLimit = Number(account?.risk_limit) || 0;
  const roundedBalance = roundMoney(balance);

  return {
    balance: roundedBalance,
    totalDebit: roundMoney(totalDebit),
    totalCredit: roundMoney(totalCredit),
    overdueBalance: roundMoney(overdueBalance),
    dueToday: roundMoney(dueToday),
    riskLimit: roundMoney(riskLimit),
    availableLimit: roundMoney(riskLimit - roundedBalance),
    lastTransactionAt,
    lastPaymentAt,
  };
}

/**
 * Bir müşterinin cari hesabını ve ledger'ını getirir.
 */
export async function getCustomerAccountWithSummary(customerId: CustomerId) {
  const supabase = createAdminClient();
  const [accountRes, txRes] = await Promise.all([
    supabase.from('customer_accounts').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase
      .from('account_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
  ]);

  if (accountRes.error) throw new Error(accountRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const account = (accountRes.data ?? null) as CustomerAccountRow | null;
  const transactions = (txRes.data ?? []) as AccountTransactionRow[];

  return {
    account,
    transactions,
    summary: summarizeTransactions(transactions, account),
  };
}

/**
 * Tüm müşterilerin cari özetlerini toplu hesaplar (cari hesaplar listesi).
 */
export async function getAllCustomerAccounts() {
  const supabase = createAdminClient();
  const [accountsRes, profilesRes] = await Promise.all([
    supabase.from('customer_accounts').select('*'),
    supabase.from('customer_profiles').select('*'),
  ]);

  if (accountsRes.error) throw new Error(accountsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const accounts = (accountsRes.data ?? []) as CustomerAccountRow[];
  const profiles = (profilesRes.data ?? []) as CustomerProfileRow[];
  const accountsByCustomer = new Map(accounts.map((acc) => [acc.customer_id, acc]));

  // Tüm ledger satırlarını tek sorguda çekip grupla
  const customerIds = accounts.map((acc) => acc.customer_id);
  const txRes =
    customerIds.length > 0
      ? await supabase.from('account_transactions').select('*').in('customer_id', customerIds)
      : { data: [], error: null };

  if (txRes.error) throw new Error(txRes.error.message);

  const txsByCustomer = new Map<CustomerId, AccountTransactionRow[]>();
  for (const tx of (txRes.data ?? []) as AccountTransactionRow[]) {
    const list = txsByCustomer.get(tx.customer_id) ?? [];
    list.push(tx);
    txsByCustomer.set(tx.customer_id, list);
  }

  const result = profiles.map((customer) => {
    const account = accountsByCustomer.get(customer.user_id) ?? null;
    const transactions = txsByCustomer.get(customer.user_id) ?? [];
    return {
      customer,
      account,
      summary: summarizeTransactions(transactions, account),
    };
  });

  // Hesabı olanlar önce; sonra bakiye olanlar
  return result.sort((a, b) => {
    if (Boolean(a.account) !== Boolean(b.account)) return a.account ? -1 : 1;
    return b.summary.balance - a.summary.balance;
  });
}

/**
 * Vadesi geçmiş ödemeleri listeler.
 */
export async function getOverduePayments(): Promise<OverduePayment[]> {
  const supabase = createAdminClient();
  const now = new Date();
  const today = startOfDay(now).toISOString().slice(0, 10);

  const [txRes, ordersRes, profilesRes] = await Promise.all([
    supabase.from('account_transactions').select('*').lt('due_date', today).order('due_date', { ascending: true }),
    supabase.from('orders').select('id, order_number, total, user_id'),
    supabase.from('customer_profiles').select('user_id, full_name, email, phone'),
  ]);

  if (txRes.error) throw new Error(txRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const profilesById = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const ordersById = new Map((ordersRes.data ?? []).map((o) => [o.id, o]));

  // Hareket bazında açık kalan tutarı hesapla
  const result: OverduePayment[] = [];

  for (const tx of (txRes.data ?? []) as AccountTransactionRow[]) {
    const openAmount = (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
    if (openAmount <= 0 || !tx.due_date) continue;

    const profile = profilesById.get(tx.customer_id);
    const order = tx.order_id ? ordersById.get(tx.order_id) : null;
    const overdueDays = daysBetween(startOfDay(new Date(`${tx.due_date}T00:00:00`)), now);

    result.push({
      customerName: profile?.full_name || profile?.email || 'Bilinmeyen müşteri',
      customerEmail: profile?.email || '',
      customerPhone: profile?.phone || '',
      orderId: tx.order_id || null,
      orderNumber: order?.order_number || null,
      total: order ? Number(order.total) : 0,
      collected: Math.max(0, (order ? Number(order.total) : 0) - openAmount),
      remaining: openAmount,
      dueDate: tx.due_date,
      overdueDays,
      description: tx.description,
    });
  }

  return result.sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Bir müşteri için tarih aralıklı cari ekstre üretir (salt okunur).
 */
export async function getAccountStatement(customerId: CustomerId, fromDate: string, toDate: string): Promise<AccountStatement> {
  const supabase = createAdminClient();
  const [profilesRes, accountRes, txRes] = await Promise.all([
    supabase.from('customer_profiles').select('user_id, full_name, email, phone').eq('user_id', customerId).maybeSingle(),
    supabase.from('customer_accounts').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase
      .from('account_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: true }),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (accountRes.error) throw new Error(accountRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const customer = (profilesRes.data ?? null) as Pick<CustomerProfileRow, 'user_id' | 'full_name' | 'email' | 'phone'> | null;
  const account = (accountRes.data ?? null) as CustomerAccountRow | null;
  const allTransactions = (txRes.data ?? []) as AccountTransactionRow[];

  // Açılış bakiyesi = toDate'e kadar olan tüm hareketlerin, fromDate'den öncekilerin toplamı
  let openingBalance = 0;
  for (const tx of allTransactions) {
    const txDate = tx.created_at.slice(0, 10);
    if (txDate < fromDate) {
      openingBalance += (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
    }
  }

  const lines: AccountStatementLine[] = [];
  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const tx of allTransactions) {
    const txDate = tx.created_at.slice(0, 10);
    if (txDate < fromDate) continue;

    const debit = Number(tx.debit) || 0;
    const credit = Number(tx.credit) || 0;
    runningBalance += debit - credit;
    totalDebit += debit;
    totalCredit += credit;

    lines.push({
      id: tx.id,
      date: tx.created_at,
      documentNo: tx.reference || tx.id.slice(0, 8),
      description: tx.description,
      debit: roundMoney(debit),
      credit: roundMoney(credit),
      balanceAfter: roundMoney(runningBalance),
      dueDate: tx.due_date,
      type: tx.type,
      isReversal: tx.is_reversal,
    });
  }

  return {
    customer,
    fromDate,
    toDate,
    openingBalance: roundMoney(openingBalance),
    totalDebit: roundMoney(totalDebit),
    totalCredit: roundMoney(totalCredit),
    closingBalance: roundMoney(openingBalance + totalDebit - totalCredit),
    lines,
  };
}

/**
 * Bir müşterinin cari hesabını yoksa oluşturur (idempotent).
 */
export async function ensureCustomerAccount(customerId: CustomerId) {
  const supabase = createAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from('customer_accounts')
    .select('id, customer_id')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('customer_accounts')
    .insert({ customer_id: customerId })
    .select('id, customer_id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
