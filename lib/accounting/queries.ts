import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AccountStatement,
  AccountStatementLine,
  CustomerAccountDetail,
  CustomerAccountListFilters,
  CustomerAccountListItem,
  CustomerAccountListPage,
  CustomerAccountSummary,
  CustomerLedgerFilters,
  CustomerLedgerPage,
  CustomerTransactionBreakdown,
  DueReceivable,
  DueReceivableStatus,
  OverduePayment,
} from '@/lib/accounting/types';
import { isAccountTransactionType } from '@/lib/accounting/ledger-filters';
import type { AccountTransactionRow, CustomerAccountRow, CustomerProfileRow } from '@/lib/catalog/types';
import type { Database } from '@/lib/supabase/database.types';
import { getStatementDateBounds } from '@/lib/accounting/statement-export';

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
  const [accountRes, txRes, summaryRes, dueRes] = await Promise.all([
    supabase.from('customer_accounts').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase
      .from('account_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
    supabase.from('customer_account_summaries').select('overdue_balance').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_receivable_due_status').select('remaining_amount, remaining_days, overdue_days').eq('customer_id', customerId),
  ]);

  if (accountRes.error) throw new Error(accountRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);
  if (summaryRes.error) throw new Error(summaryRes.error.message);
  if (dueRes.error) throw new Error(dueRes.error.message);

  const account = (accountRes.data ?? null) as CustomerAccountRow | null;
  const transactions = (txRes.data ?? []) as AccountTransactionRow[];
  const summary = summarizeTransactions(transactions, account);
  summary.overdueBalance = roundMoney(Number(summaryRes.data?.overdue_balance) || 0);
  summary.dueToday = roundMoney((dueRes.data ?? []).reduce((sum, item) => {
    const remaining = Number(item.remaining_amount) || 0;
    return remaining > 0 && Number(item.remaining_days) === 0 && Number(item.overdue_days) === 0
      ? sum + remaining
      : sum;
  }, 0));

  return {
    account,
    transactions,
    summary,
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

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

type CustomerAccountSummaryViewRow = Database['public']['Views']['customer_account_summaries']['Row'];

function mapCustomerAccountSummaryRow(row: CustomerAccountSummaryViewRow): CustomerAccountListItem | null {
  if (!row.customer_id) return null;

  return {
    customerId: row.customer_id,
    accountId: row.account_id,
    customerName: row.customer_name || row.email || 'İsimsiz müşteri',
    email: row.email || '',
    phone: row.phone || '',
    accountCode: row.account_code || `CARI-${row.customer_id.slice(0, 8).toUpperCase()}`,
    isActive: row.is_active ?? false,
    totalDebit: roundMoney(Number(row.total_debit) || 0),
    totalCredit: roundMoney(Number(row.total_credit) || 0),
    balance: roundMoney(Number(row.balance) || 0),
    overdueBalance: roundMoney(Number(row.overdue_balance) || 0),
    riskLimit: roundMoney(Number(row.risk_limit) || 0),
    availableLimit: roundMoney(Number(row.available_limit) || 0),
    riskExceeded: row.risk_exceeded ?? false,
    lastTransactionAt: row.last_transaction_at,
  };
}

/**
 * Cari ana ekranı için filtreleme ve sayfalamayı veritabanında yapar.
 * Aggregate view tek sorguda ledger özetlerini üretir; browser'a tüm ledger
 * veya müşteri kayıtları indirilmez.
 */
export async function getCustomerAccountsPage(filters: CustomerAccountListFilters): Promise<CustomerAccountListPage> {
  const supabase = createAdminClient();
  const offset = (filters.page - 1) * filters.pageSize;

  let listQuery = supabase
    .from('customer_account_summaries')
    .select('*', { count: 'exact' });

  if (filters.query) {
    listQuery = listQuery.ilike('search_text', `%${escapeLikePattern(filters.query)}%`);
  }
  if (filters.balance === 'debtor') {
    listQuery = listQuery.gt('balance', 0);
  } else if (filters.balance === 'creditor') {
    listQuery = listQuery.lt('balance', 0);
  }
  if (filters.overdue) {
    listQuery = listQuery.gt('overdue_balance', 0);
  }
  if (filters.riskExceeded) {
    listQuery = listQuery.eq('risk_exceeded', true);
  }
  if (filters.status) {
    listQuery = listQuery.eq('is_active', filters.status === 'active');
  }

  const [listResult, metricsResult] = await Promise.all([
    listQuery
      .order('last_transaction_at', { ascending: false, nullsFirst: false })
      .order('customer_name', { ascending: true })
      .range(offset, offset + filters.pageSize - 1),
    supabase.from('customer_account_metrics').select('*').single(),
  ]);

  if (listResult.error) throw new Error(listResult.error.message);
  if (metricsResult.error) throw new Error(metricsResult.error.message);

  const items = (listResult.data ?? []).flatMap((row) => {
    const item = mapCustomerAccountSummaryRow(row);
    return item ? [item] : [];
  });

  const total = listResult.count ?? 0;
  const metrics = metricsResult.data;

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    metrics: {
      customerCount: Number(metrics.customer_count) || 0,
      totalReceivable: roundMoney(Number(metrics.total_receivable) || 0),
      totalCustomerCredit: roundMoney(Number(metrics.total_customer_credit) || 0),
      totalOverdue: roundMoney(Number(metrics.total_overdue) || 0),
    },
  };
}

/**
 * Cari detay ekranının header, KPI ve genel bakış verisini müşteri bazında
 * paralel sorgular. Finansal toplamların tek kaynağı aggregate summary view'dır.
 */
export async function getCustomerAccountDetail(customerId: string): Promise<CustomerAccountDetail | null> {
  const supabase = createAdminClient();
  const openOrderStatuses: Database['public']['Enums']['order_status'][] = [
    'pending_payment',
    'confirmed',
    'preparing',
    'shipped',
  ];

  const [summaryResult, accountResult, riskResult, priceListResult, openOrdersResult, transactionsResult, paymentsResult, dueResult] = await Promise.all([
    supabase.from('customer_account_summaries').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_accounts').select('payment_term_days').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_risk_status').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase
      .from('customer_price_lists')
      .select('created_at, price_lists(name, code)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('orders').select('total').eq('user_id', customerId).in('status', openOrderStatuses),
    supabase
      .from('account_transactions')
      .select('id, type, reference, description, debit, credit, balance_after, due_date, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('id, amount, paid_at, payment_method, reference_number, status')
      .eq('customer_id', customerId)
      .order('paid_at', { ascending: false })
      .limit(5),
    supabase
      .from('customer_receivable_due_status')
      .select('*')
      .eq('customer_id', customerId)
      .order('due_date', { ascending: true })
      .limit(100),
  ]);

  const firstError = [
    summaryResult.error,
    accountResult.error,
    riskResult.error,
    priceListResult.error,
    openOrdersResult.error,
    transactionsResult.error,
    paymentsResult.error,
    dueResult.error,
  ].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const summary = summaryResult.data ? mapCustomerAccountSummaryRow(summaryResult.data) : null;
  if (!summary) return null;
  const risk = riskResult.data;

  const priceListRelation = priceListResult.data?.price_lists;
  const priceList = priceListRelation && !Array.isArray(priceListRelation)
    ? { name: priceListRelation.name, code: priceListRelation.code }
    : null;
  const dueItems = (dueResult.data ?? []).flatMap(mapDueReceivableRow);
  const upcomingDueItems = dueItems.flatMap((item) => {
    if (!item.dueDate || item.remaining <= 0 || item.overdueDays > 0) return [];
    return [{
      id: item.transactionId,
      reference: item.reference,
      description: item.description,
      dueDate: item.dueDate,
      openAmount: item.remaining,
    }];
  });

  return {
    summary,
    paymentTermDays: Number(accountResult.data?.payment_term_days) || 0,
    riskPolicy: (risk?.risk_policy as CustomerAccountDetail['riskPolicy']) || 'warn',
    riskWarningThreshold: Number(risk?.warning_threshold) || 80,
    riskUsagePercent: roundMoney(Number(risk?.usage_percent) || 0),
    ledgerExposure: roundMoney(Number(risk?.ledger_exposure) || 0),
    unpostedOrderExposure: roundMoney(Number(risk?.unposted_order_exposure) || 0),
    priceList,
    openOrderAmount: roundMoney((openOrdersResult.data ?? []).reduce((sum, order) => sum + (Number(order.total) || 0), 0)),
    upcomingDueAmount: roundMoney(upcomingDueItems.reduce((sum, item) => sum + item.openAmount, 0)),
    usedLimit: roundMoney(Number(risk?.used_limit) || 0),
    lastPaymentAt: paymentsResult.data?.[0]?.paid_at ?? null,
    recentTransactions: transactionsResult.data ?? [],
    recentPayments: paymentsResult.data ?? [],
    upcomingDueItems,
    dueItems,
  };
}

export async function getCustomerSmsLogs(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sms_logs')
    .select('id, event_type, template_key, body, status, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error('SMS bildirim geçmişi yüklenemedi.');
  return data ?? [];
}

/** Server-side filtered and paginated immutable ledger rows for one customer. */
export async function getCustomerLedgerPage(customerId: string, filters: CustomerLedgerFilters): Promise<CustomerLedgerPage> {
  const supabase = createAdminClient();
  const offset = (filters.page - 1) * filters.pageSize;

  let query = supabase
    .from('account_transaction_ledger')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId);

  if (filters.query) query = query.ilike('search_text', `%${escapeLikePattern(filters.query)}%`);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.fromDate) query = query.gte('created_at', `${filters.fromDate}T00:00:00.000Z`);
  if (filters.toDate) query = query.lte('created_at', `${filters.toDate}T23:59:59.999Z`);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + filters.pageSize - 1);

  if (error) throw new Error(error.message);

  const items = (data ?? []).flatMap((row) => {
    if (!row.transaction_id || !row.created_at || !row.type || !isAccountTransactionType(row.type)) return [];
    return [{
      id: row.transaction_id,
      transactionNumber: `CHR-${row.transaction_id.slice(0, 8).toUpperCase()}`,
      type: row.type,
      reference: row.reference || '',
      description: row.description || '',
      dueDate: row.due_date,
      debit: roundMoney(Number(row.debit) || 0),
      credit: roundMoney(Number(row.credit) || 0),
      balanceAfter: roundMoney(Number(row.balance_after) || 0),
      actorUserId: row.actor_user_id,
      actorName: row.actor_name || 'Sistem',
      orderNumber: row.order_number,
      isReversal: row.is_reversal ?? false,
      reversedTransactionId: row.reversed_transaction_id,
      createdAt: row.created_at,
    }];
  });

  const total = count ?? 0;
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

/** Aggregate debit/credit totals by the repository's existing transaction types. */
export async function getCustomerTransactionBreakdown(customerId: string): Promise<CustomerTransactionBreakdown[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_account_transaction_breakdown')
    .select('*')
    .eq('customer_id', customerId)
    .order('last_transaction_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    if (!row.type || !isAccountTransactionType(row.type)) return [];
    return [{
      type: row.type,
      transactionCount: Number(row.transaction_count) || 0,
      totalDebit: roundMoney(Number(row.total_debit) || 0),
      totalCredit: roundMoney(Number(row.total_credit) || 0),
      netBalance: roundMoney(Number(row.net_balance) || 0),
      lastTransactionAt: row.last_transaction_at,
    }];
  });
}

type DueStatusViewRow = Database['public']['Views']['customer_receivable_due_status']['Row'];

function isDueReceivableStatus(value: string | null): value is DueReceivableStatus {
  return value === 'OPEN'
    || value === 'APPROACHING'
    || value === 'DUE_TODAY'
    || value === 'OVERDUE'
    || value === 'PARTIAL_PAID'
    || value === 'PAID';
}

function mapDueReceivableRow(row: DueStatusViewRow): DueReceivable[] {
  if (!row.transaction_id || !row.customer_id || !row.due_date || !isDueReceivableStatus(row.status)) return [];
  return [{
    transactionId: row.transaction_id,
    customerName: row.customer_name || row.customer_email || 'Bilinmeyen müşteri',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    orderId: row.order_id,
    orderNumber: row.order_number,
    total: roundMoney(Number(row.original_amount) || 0),
    collected: roundMoney(Number(row.paid_amount) || 0),
    remaining: roundMoney(Number(row.remaining_amount) || 0),
    dueDate: row.due_date,
    remainingDays: Number(row.remaining_days) || 0,
    overdueDays: Number(row.overdue_days) || 0,
    status: row.status,
    reference: row.reference || '',
    description: row.description || '',
  }];
}

export async function getDueReceivables(): Promise<DueReceivable[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_receivable_due_status')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap(mapDueReceivableRow);
}

/** Vadesi geçmiş ve halen açık alacaklar. Gün hesabı PostgreSQL'de İstanbul saatine göre yapılır. */
export async function getOverduePayments(): Promise<OverduePayment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_receivable_due_status')
    .select('*')
    .gt('overdue_days', 0)
    .gt('remaining_amount', 0)
    .order('overdue_days', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap(mapDueReceivableRow);
}

/**
 * Bir müşteri için tarih aralıklı cari ekstre üretir (salt okunur).
 */
export async function getAccountStatement(customerId: CustomerId, fromDate: string, toDate: string): Promise<AccountStatement> {
  const supabase = createAdminClient();
  const { fromInclusive, toExclusive } = getStatementDateBounds(fromDate, toDate);
  const [profilesRes, txRes] = await Promise.all([
    supabase.from('customer_profiles').select('user_id, full_name, email, phone').eq('user_id', customerId).maybeSingle(),
    supabase
      .from('account_transactions')
      .select('*')
      .eq('customer_id', customerId)
        .lt('created_at', toExclusive.toISOString())
      .order('created_at', { ascending: true }),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const customer = (profilesRes.data ?? null) as Pick<CustomerProfileRow, 'user_id' | 'full_name' | 'email' | 'phone'> | null;
  const allTransactions = (txRes.data ?? []) as AccountTransactionRow[];
  if (!customer) throw new Error('Müşteri bulunamadı.');

  // Açılış bakiyesi = toDate'e kadar olan tüm hareketlerin, fromDate'den öncekilerin toplamı
  let openingBalance = 0;
  for (const tx of allTransactions) {
      if (new Date(tx.created_at) < fromInclusive) {
      openingBalance += (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
    }
  }

  const lines: AccountStatementLine[] = [];
  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const tx of allTransactions) {
      if (new Date(tx.created_at) < fromInclusive) continue;

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
      accountCode: `CARI-${customerId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
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
