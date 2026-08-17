import { createAdminClient } from '@/lib/supabase/admin';
import { ensureCustomerAccount, roundMoney, summarizeTransactions } from '@/lib/accounting/queries';
import type { AccountTransactionRow, CustomerAccountRow, PaymentRow } from '@/lib/catalog/types';
import type { AccountTransactionType as AccountingAccountTransactionType } from '@/lib/catalog/types';

/**
 * Finansal mutasyonlar. Hepsi idempotency key ile korunur:
 * Aynı işlem (ör. aynı sipariş / aynı callback) iki kez çalışırsa yalnızca
 * ilki uygulanır; duplikat idempotent olarak kabul edilir.
 */

export type AccountingError = {
  ok: false;
  error: string;
};

export type AccountingSuccess = {
  ok: true;
  message: string;
  balance: number;
};

export type AccountingResult = AccountingError | AccountingSuccess;

export class IdempotencyHitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyHitError';
  }
}

async function getAccount(customerId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('customer_accounts')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();
  return (data ?? null) as CustomerAccountRow | null;
}

async function getTransactionsForCustomer(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('account_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AccountTransactionRow[];
}

async function getBalanceAfter(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('account_transactions')
    .select('balance_after')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return roundMoney(data ? Number(data.balance_after) : 0);
}

async function getSummaryAfter(customerId: string) {
  const [account, transactions] = await Promise.all([
    getAccount(customerId),
    getTransactionsForCustomer(customerId),
  ]);
  return summarizeTransactions(transactions, account);
}

/**
 * customer_accounts özet alanlarını ledger'dan türetip günceller.
 */
async function syncAccountSummary(customerId: string) {
  const supabase = createAdminClient();
  const [account, transactions] = await Promise.all([
    getAccount(customerId),
    getTransactionsForCustomer(customerId),
  ]);
  const summary = summarizeTransactions(transactions, account);
  const { error } = await supabase
    .from('customer_accounts')
    .update({
      overdue_balance: summary.overdueBalance,
      last_transaction_at: summary.lastTransactionAt,
      last_payment_at: summary.lastPaymentAt,
    })
    .eq('customer_id', customerId);
  if (error) throw new Error(error.message);
}

/**
 * Yeni ledger satırı. Unique idempotency_key ile duplicate koruması.
 * balance_after her zaman güncel running balance üzerinden hesaplanır.
 */
async function appendTransaction({
  customerId,
  type,
  debit,
  credit,
  orderId = null,
  paymentId = null,
  dueDate = null,
  description,
  reference = '',
  actorUserId = null,
  isReversal = false,
  reversedTransactionId = null,
  idempotencyKey,
}: {
  customerId: string;
  type: AccountTransactionRow['type'];
  debit: number;
  credit: number;
  orderId?: string | null;
  paymentId?: string | null;
  dueDate?: string | null;
  description: string;
  reference?: string;
  actorUserId?: string | null;
  isReversal?: boolean;
  reversedTransactionId?: string | null;
  idempotencyKey: string;
}) {
  const supabase = createAdminClient();
  await ensureCustomerAccount(customerId);

  const transactions = await getTransactionsForCustomer(customerId);
  const runningBalance = transactions.reduce((sum, tx) => sum + (Number(tx.debit) || 0) - (Number(tx.credit) || 0), 0);
  const balanceAfter = roundMoney(runningBalance + debit - credit);

  const { data, error } = await supabase
    .from('account_transactions')
    .insert({
      customer_id: customerId,
      type,
      debit: roundMoney(Math.max(0, debit)),
      credit: roundMoney(Math.max(0, credit)),
      amount: roundMoney(Math.max(debit, credit)),
      balance_after: balanceAfter,
      order_id: orderId,
      payment_id: paymentId,
      due_date: dueDate,
      description,
      reference,
      actor_user_id: actorUserId,
      is_reversal: isReversal,
      reversed_transaction_id: reversedTransactionId,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new IdempotencyHitError('Bu işlem zaten uygulanmış.');
    }
    throw new Error(error.message);
  }

  await syncAccountSummary(customerId);
  return data as AccountTransactionRow;
}

/**
 * Siparişi cariye borç (debit) hareketi olarak işler. Idempotent:
 * aynı sipariş iki kez cariye işlenemez.
 */
export async function postOrderToAccount(
  customerId: string,
  order: { id: string; total: number; dueDate?: string | null },
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const idempotencyKey = `order:${order.id}`;
  try {
    await appendTransaction({
      customerId,
      type: 'ORDER',
      debit: Number(order.total),
      credit: 0,
      orderId: order.id,
      dueDate: order.dueDate ?? null,
      description: 'Sipariş carisinde borç hareketi',
      reference: order.id,
      actorUserId: options.actorUserId ?? null,
      idempotencyKey,
    });
    const summary = await getSummaryAfter(customerId);
    return { ok: true, message: 'Sipariş cariye aktarıldı.', balance: summary.balance };
  } catch (error) {
    if (error instanceof IdempotencyHitError) {
      const summary = await getSummaryAfter(customerId);
      return { ok: true, message: 'Sipariş zaten cariye işlenmiş.', balance: summary.balance };
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Sipariş cariye işlenemedi.' };
  }
}

/**
 * Sipariş iptali — ters kayıt (CANCELLATION/credit). Geçmiş ledger satırı
 * silinmez; audit trail korunur. Idempotent.
 */
export async function cancelOrderInAccount(
  customerId: string,
  order: { id: string; total: number },
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const idempotencyKey = `order-cancel:${order.id}`;
  try {
    await appendTransaction({
      customerId,
      type: 'CANCELLATION',
      debit: 0,
      credit: Number(order.total),
      orderId: order.id,
      description: 'Sipariş iptali — ters kayıt',
      reference: order.id,
      actorUserId: options.actorUserId ?? null,
      isReversal: true,
      idempotencyKey,
    });
    const summary = await getSummaryAfter(customerId);
    return { ok: true, message: 'Sipariş iptali cariye işlendi.', balance: summary.balance };
  } catch (error) {
    if (error instanceof IdempotencyHitError) {
      const summary = await getSummaryAfter(customerId);
      return { ok: true, message: 'Sipariş iptali zaten uygulanmış.', balance: summary.balance };
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Sipariş iptali işlenemedi.' };
  }
}

/**
 * Tahsilat girişi (manuel / kısmi). Idempotent — aynı tahsilat iki kez
 * bakiyeyi etkilemez.
 */
export async function collectPayment(
  customerId: string,
  payload: {
    amount: number;
    paidAt?: string | null;
    paymentMethod?: string;
    referenceNumber?: string;
    description?: string;
    orderId?: string | null;
    provider?: string;
    provider_reference?: string | null;
    idempotencyKey: string;
  },
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const supabase = createAdminClient();
  const amount = roundMoney(Math.abs(payload.amount));

  if (amount <= 0) {
    return { ok: false, error: 'Tahsilat tutarı sıfırdan büyük olmalıdır.' };
  }

  try {
    await ensureCustomerAccount(customerId);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        customer_id: customerId,
        order_id: payload.orderId ?? null,
        amount,
        paid_at: payload.paidAt ? new Date(payload.paidAt).toISOString() : new Date().toISOString(),
        payment_method: payload.paymentMethod ?? 'manual',
        reference_number: payload.referenceNumber ?? '',
        description: payload.description ?? '',
        status: 'completed',
        provider: payload.provider ?? 'manual',
        provider_reference: payload.provider_reference ?? null,
        actor_user_id: options.actorUserId ?? null,
        idempotency_key: payload.idempotencyKey,
      })
      .select()
      .single();

    if (paymentError) {
      if (paymentError.code === '23505') {
        const balance = await getBalanceAfter(customerId);
        return { ok: true, message: 'Bu tahsilat zaten kaydedilmiş.', balance };
      }
      throw new Error(paymentError.message);
    }

    const paymentRecord = payment as PaymentRow;

    await appendTransaction({
      customerId,
      type: payload.orderId ? 'PAYMENT' : 'PAYMENT',
      debit: 0,
      credit: amount,
      orderId: payload.orderId ?? null,
      paymentId: paymentRecord.id,
      description: payload.description || 'Tahsilat',
      reference: payload.referenceNumber || paymentRecord.id.slice(0, 8),
      actorUserId: options.actorUserId ?? null,
      idempotencyKey: `payment:${paymentRecord.id}:credit`,
    });

    const balance = await getBalanceAfter(customerId);
    return { ok: true, message: 'Tahsilat başarıyla işlendi.', balance };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tahsilat kaydedilemedi.' };
  }
}

/**
 * Tahsilat iptali — payment status 'reversed' + ters kayıt. Idempotent.
 */
export async function reversePayment(
  customerId: string,
  paymentId: string,
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const supabase = createAdminClient();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (paymentError) throw new Error(paymentError.message);
  if (!payment) return { ok: false, error: 'Tahsilat bulunamadı.' };
  if (payment.status === 'reversed') {
    return { ok: true, message: 'Tahsilat zaten iptal edilmiş.', balance: await getBalanceAfter(customerId) };
  }

  const paymentRecord = payment as PaymentRow;
  const idempotencyKey = `payment-reverse:${paymentId}`;

  try {
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'reversed' })
      .eq('id', paymentId)
      .eq('customer_id', customerId);
    if (updateError) throw new Error(updateError.message);

    await appendTransaction({
      customerId,
      type: 'REFUND',
      debit: Number(paymentRecord.amount),
      credit: 0,
      orderId: paymentRecord.order_id,
      paymentId,
      description: 'Tahsilat iptali — ters kayıt',
      reference: paymentRecord.reference_number || paymentId,
      actorUserId: options.actorUserId ?? null,
      isReversal: true,
      reversedTransactionId: paymentId,
      idempotencyKey,
    });

    const balance = await getBalanceAfter(customerId);
    return { ok: true, message: 'Tahsilat iptal edildi.', balance };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tahsilat iptal edilemedi.' };
  }
}

/**
 * Manuel bakiye düzeltmesi (ADJUSTMENT). Audit trail korunur.
 */
export async function adjustBalance(
  customerId: string,
  payload: { amount: number; description: string; dueDate?: string | null; idempotencyKey: string },
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const amount = roundMoney(Math.abs(payload.amount));
  if (amount <= 0) return { ok: false, error: 'Düzeltme tutarı sıfırdan büyük olmalıdır.' };

  try {
    await appendTransaction({
      customerId,
      type: 'ADJUSTMENT',
      debit: payload.amount > 0 ? amount : 0,
      credit: payload.amount < 0 ? amount : 0,
      dueDate: payload.dueDate ?? null,
      description: payload.description,
      reference: 'adjustment',
      actorUserId: options.actorUserId ?? null,
      idempotencyKey: payload.idempotencyKey,
    });
    const balance = await getBalanceAfter(customerId);
    return { ok: true, message: 'Cari bakiye düzeltildi.', balance };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Bakiye düzeltilemedi.' };
  }
}

/**
 * Müşterinin risk limitini günceller.
 */
export async function updateRiskLimit(customerId: string, riskLimit: number): Promise<AccountingResult> {
  const supabase = createAdminClient();
  const limit = roundMoney(Math.max(0, Number(riskLimit) || 0));
  try {
    await ensureCustomerAccount(customerId);
    const { error } = await supabase
      .from('customer_accounts')
      .update({ risk_limit: limit })
      .eq('customer_id', customerId);
    if (error) throw new Error(error.message);
    const summary = await getSummaryAfter(customerId);
    return { ok: true, message: 'Risk limiti güncellendi.', balance: summary.balance };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Risk limiti güncellenemedi.' };
  }
}

export type { AccountingAccountTransactionType as AccountingTransactionType };
