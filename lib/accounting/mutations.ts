import { createAdminClient } from '@/lib/supabase/admin';
import { ensureCustomerAccount, roundMoney } from '@/lib/accounting/queries';
import type { AccountTransactionRow } from '@/lib/catalog/types';
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

async function getCurrentBalance(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_account_summaries')
    .select('balance')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return roundMoney(data ? Number(data.balance) : 0);
}

/**
 * customer_accounts özet alanlarını ledger'dan türetip günceller.
 */
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
  const { data, error } = await supabase.rpc('append_account_transaction', {
    p_customer_id: customerId,
    p_type: type,
    p_debit: roundMoney(Math.max(0, debit)),
    p_credit: roundMoney(Math.max(0, credit)),
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_due_date: dueDate,
    p_description: description,
    p_reference: reference,
    p_actor_user_id: actorUserId,
    p_is_reversal: isReversal,
    p_reversed_transaction_id: reversedTransactionId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw new Error(error.message);

  const result = data?.[0];
  if (!result) throw new Error('Cari hareket oluşturulamadı.');
  if (result.idempotency_hit) throw new IdempotencyHitError('Bu işlem zaten uygulanmış.');

  return {
    transactionId: result.transaction_id,
    balance: roundMoney(Number(result.resulting_balance) || 0),
  };
}

/**
 * Siparişi cariye borç (debit) hareketi olarak işler. Idempotent:
 * aynı sipariş iki kez cariye işlenemez.
 */
export async function postOrderToAccount(
  orderId: string,
  options: { actorUserId?: string | null; dueDate?: string | null } = {}
): Promise<AccountingResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('sync_order_accounting', {
      p_order_id: orderId,
      p_due_date: options.dueDate ?? null,
      p_actor_user_id: options.actorUserId ?? null,
    });

    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error('Sipariş cari entegrasyonu sonuç üretmedi.');

    const message = result.accounting_action === 'posted'
      ? 'Sipariş cariye aktarıldı.'
      : result.accounting_action === 'reposted'
        ? 'Sipariş tutar değişikliği ters kayıt ve yeni borç ile işlendi.'
        : result.accounting_action === 'duplicate'
          ? 'Sipariş zaten cariye işlenmiş.'
          : 'Sipariş henüz cari borç oluşturacak durumda değil.';

    return { ok: true, message, balance: roundMoney(Number(result.resulting_balance) || 0) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sipariş cariye işlenemedi.' };
  }
}

/**
 * Sipariş iptali — ters kayıt (CANCELLATION/credit). Geçmiş ledger satırı
 * silinmez; audit trail korunur. Idempotent.
 */
export async function cancelOrderInAccount(
  orderId: string,
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('cancel_order_with_accounting', {
      p_order_id: orderId,
      p_actor_user_id: options.actorUserId ?? null,
    });

    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error('Sipariş iptali cari entegrasyonu sonuç üretmedi.');

    return {
      ok: true,
      message: result.accounting_action === 'reversed'
        ? 'Sipariş iptali ters kayıtla cariye işlendi.'
        : 'Sipariş iptal edildi; ters çevrilecek cari borç bulunmuyordu.',
      balance: roundMoney(Number(result.resulting_balance) || 0),
    };
  } catch (error) {
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
    note?: string;
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
    const { data, error } = await supabase.rpc('record_account_payment', {
      p_customer_id: customerId,
      p_amount: amount,
      p_paid_at: payload.paidAt ? new Date(payload.paidAt).toISOString() : new Date().toISOString(),
      p_payment_method: payload.paymentMethod ?? 'manual',
      p_reference_number: payload.referenceNumber ?? '',
      p_description: payload.description ?? '',
      p_note: payload.note ?? '',
      p_order_id: payload.orderId ?? null,
      p_provider: payload.provider ?? 'manual',
      p_provider_reference: payload.provider_reference ?? null,
      p_actor_user_id: options.actorUserId ?? null,
      p_idempotency_key: payload.idempotencyKey,
    });

    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error('Tahsilat işlemi sonuç üretmedi.');

    const message = result.idempotency_hit
      ? 'Bu tahsilat zaten kaydedilmiş.'
      : result.payment_type === 'PARTIAL_PAYMENT'
        ? 'Kısmi tahsilat başarıyla işlendi.'
        : 'Tahsilat başarıyla işlendi.';

    if (result.payment_id) {
      const { sendPaymentReceivedNotification } = await import('@/lib/sms/payment-notifications');
      await sendPaymentReceivedNotification({
        customerId,
        paymentId: result.payment_id,
        paymentAmount: amount,
        balance: roundMoney(Number(result.resulting_balance) || 0),
        actorUserId: options.actorUserId,
      }).catch(() => undefined);
    }

    return { ok: true, message, balance: roundMoney(Number(result.resulting_balance) || 0) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tahsilat kaydedilemedi.' };
  }
}

/**
 * Tahsilat iptali — payment status 'reversed' + ters kayıt. Idempotent.
 */
export async function reversePayment(
  paymentId: string,
  options: { actorUserId?: string | null } = {}
): Promise<AccountingResult> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc('reverse_account_payment', {
      p_payment_id: paymentId,
      p_actor_user_id: options.actorUserId ?? null,
    });

    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error('Tahsilat iptali sonuç üretmedi.');

    return {
      ok: true,
      message: result.idempotency_hit ? 'Tahsilat zaten iptal edilmiş.' : 'Tahsilat ters kayıtla iptal edildi.',
      balance: roundMoney(Number(result.resulting_balance) || 0),
    };
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
    const transaction = await appendTransaction({
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
    return { ok: true, message: 'Cari bakiye düzeltildi.', balance: transaction.balance };
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
    const { data: account, error: accountError } = await supabase
      .from('customer_accounts')
      .select('risk_policy, risk_warning_threshold')
      .eq('customer_id', customerId)
      .single();
    if (accountError) throw new Error(accountError.message);

    const { error } = await supabase.rpc('update_customer_risk_settings', {
      p_customer_id: customerId,
      p_risk_limit: limit,
      p_risk_policy: account.risk_policy,
      p_warning_threshold: account.risk_warning_threshold,
      p_actor_user_id: null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, message: 'Risk limiti güncellendi.', balance: await getCurrentBalance(customerId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Risk limiti güncellenemedi.' };
  }
}

export type { AccountingAccountTransactionType as AccountingTransactionType };
