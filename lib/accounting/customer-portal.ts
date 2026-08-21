import 'server-only';

import { requireCustomerSession } from '@/lib/commerce/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAccountStatement, roundMoney } from '@/lib/accounting/queries';
import type { AccountStatement } from '@/lib/accounting/types';

export type CustomerPortalTransaction = {
  id: string;
  createdAt: string;
  type: string;
  documentNo: string;
  description: string;
  dueDate: string | null;
  debit: number;
  credit: number;
  balanceAfter: number;
  isReversal: boolean;
};

export type CustomerPortalPayment = {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  reference: string;
  status: string;
};

export type CustomerPortalDueItem = {
  transactionId: string;
  orderNumber: string;
  description: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  remainingDays: number;
  overdueDays: number;
  status: string;
};

export type CustomerAccountPortalDTO = {
  customer: { name: string; email: string; phone: string };
  accountCode: string;
  balance: number;
  openDebt: number;
  totalDebit: number;
  totalCredit: number;
  overdueBalance: number;
  upcomingDueAmount: number;
  riskLimit: number;
  usedLimit: number;
  availableLimit: number;
  usagePercent: number;
  riskExceeded: boolean;
  orderCount: number;
  openOrderCount: number;
  transactions: CustomerPortalTransaction[];
  payments: CustomerPortalPayment[];
  dueItems: CustomerPortalDueItem[];
  statement: AccountStatement;
};

/**
 * Ownership-safe portal DAL. The caller cannot provide a customer identifier;
 * ownership is always derived from the verified Supabase session.
 */
export async function getOwnCustomerAccountPortal(fromDate: string, toDate: string): Promise<CustomerAccountPortalDTO> {
  const session = await requireCustomerSession('/hesabim/cari');
  const customerId = session.user.id;
  const supabase = createAdminClient();

  const [summaryResult, riskResult, transactionsResult, paymentsResult, dueResult, ordersResult, statement] = await Promise.all([
    supabase.from('customer_account_summaries').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_risk_status').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase
      .from('account_transactions')
      .select('id, created_at, type, reference, description, due_date, debit, credit, balance_after, is_reversal')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payments')
      .select('id, amount, paid_at, payment_method, reference_number, status')
      .eq('customer_id', customerId)
      .order('paid_at', { ascending: false })
      .limit(50),
    supabase
      .from('customer_receivable_due_status')
      .select('transaction_id, order_number, description, due_date, original_amount, paid_amount, remaining_amount, remaining_days, overdue_days, status')
      .eq('customer_id', customerId)
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true })
      .limit(100),
    supabase.from('orders').select('status').eq('user_id', customerId),
    getAccountStatement(customerId, fromDate, toDate),
  ]);

  const error = [
    summaryResult.error,
    riskResult.error,
    transactionsResult.error,
    paymentsResult.error,
    dueResult.error,
    ordersResult.error,
  ].find(Boolean);
  if (error) throw new Error('Cari hesap bilgileriniz şu anda alınamıyor.');

  const summary = summaryResult.data;
  const risk = riskResult.data;
  const dueItems = (dueResult.data ?? []).flatMap((item): CustomerPortalDueItem[] => {
    if (!item.transaction_id || !item.due_date) return [];
    return [{
      transactionId: item.transaction_id,
      orderNumber: item.order_number || '',
      description: item.description || '',
      dueDate: item.due_date,
      originalAmount: roundMoney(Number(item.original_amount) || 0),
      paidAmount: roundMoney(Number(item.paid_amount) || 0),
      remainingAmount: roundMoney(Number(item.remaining_amount) || 0),
      remainingDays: Number(item.remaining_days) || 0,
      overdueDays: Number(item.overdue_days) || 0,
      status: item.status || 'OPEN',
    }];
  });
  const upcomingDueAmount = dueItems.reduce(
    (total, item) => total + (item.overdueDays === 0 ? item.remainingAmount : 0),
    0
  );
  const orders = ordersResult.data ?? [];

  return {
    customer: {
      name: session.profile.full_name || session.profile.email || 'Müşteri',
      email: session.profile.email || '',
      phone: session.profile.phone || '',
    },
    accountCode: summary?.account_code || `CARI-${customerId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    balance: roundMoney(Number(summary?.balance) || 0),
    openDebt: roundMoney(Math.max(0, Number(summary?.balance) || 0)),
    totalDebit: roundMoney(Number(summary?.total_debit) || 0),
    totalCredit: roundMoney(Number(summary?.total_credit) || 0),
    overdueBalance: roundMoney(Number(summary?.overdue_balance) || 0),
    upcomingDueAmount: roundMoney(upcomingDueAmount),
    riskLimit: roundMoney(Number(risk?.risk_limit) || 0),
    usedLimit: roundMoney(Number(risk?.used_limit) || 0),
    availableLimit: roundMoney(Number(risk?.available_limit) || 0),
    usagePercent: roundMoney(Number(risk?.usage_percent) || 0),
    riskExceeded: risk?.risk_exceeded ?? false,
    orderCount: orders.length,
    openOrderCount: orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length,
    transactions: (transactionsResult.data ?? []).map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      type: item.type,
      documentNo: item.reference || item.id.slice(0, 8).toUpperCase(),
      description: item.description,
      dueDate: item.due_date,
      debit: roundMoney(Number(item.debit) || 0),
      credit: roundMoney(Number(item.credit) || 0),
      balanceAfter: roundMoney(Number(item.balance_after) || 0),
      isReversal: item.is_reversal,
    })),
    payments: (paymentsResult.data ?? []).map((item) => ({
      id: item.id,
      amount: roundMoney(Number(item.amount) || 0),
      paidAt: item.paid_at,
      method: item.payment_method,
      reference: item.reference_number,
      status: item.status,
    })),
    dueItems,
    statement,
  };
}

/** Export entry point with no customer-id argument, preventing IDOR by design. */
export async function getOwnCustomerStatement(fromDate: string, toDate: string) {
  const session = await requireCustomerSession('/hesabim/cari');
  return getAccountStatement(session.user.id, fromDate, toDate);
}
