'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  adjustBalance,
  cancelOrderInAccount,
  collectPayment,
  postOrderToAccount,
  reversePayment,
} from '@/lib/accounting/mutations';

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getNumber(formData: FormData, key: string) {
  const value = getText(formData, key).replace(',', '.');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value ? value : null;
}

function revalidateAccounting(customerId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/accounting/tahsilatlar');
  revalidatePath('/admin/accounting/hareketler');
  revalidatePath('/admin/accounting/ekstreler');
  revalidatePath('/admin/accounting/geciken-odemeler');
  revalidatePath('/admin/customers');
  if (customerId) revalidatePath(`/admin/accounting/${customerId}`);
}

export async function collectPaymentAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.collectPayment');
  const customerId = getText(formData, 'customer_id');
  const amount = getNumber(formData, 'amount');
  const orderId = getText(formData, 'order_id') || null;

  if (!customerId || amount <= 0) {
    throw new Error('Geçerli bir müşteri ve tahsilat tutarı girin.');
  }

  const result = await collectPayment(
    customerId,
    {
      amount,
      paidAt: getOptionalDate(formData, 'paid_at') ?? new Date().toISOString(),
      paymentMethod: getText(formData, 'payment_method') || 'manual',
      referenceNumber: getText(formData, 'reference_number'),
      description: getText(formData, 'description'),
      note: getText(formData, 'note'),
      orderId,
      provider: 'manual',
      idempotencyKey: getText(formData, 'idempotency_key') || `manual-payment:${randomUUID()}`,
    },
    { actorUserId: session.user.id }
  );

  if (!result.ok) throw new Error(result.error);

  revalidateAccounting(customerId);
}

export async function reversePaymentAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.reverseTransaction');
  const customerId = getText(formData, 'customer_id');
  const paymentId = getText(formData, 'payment_id');

  if (!customerId || !paymentId) {
    throw new Error('Tahsilat bilgileri eksik.');
  }

  const result = await reversePayment(paymentId, { actorUserId: session.user.id });
  if (!result.ok) throw new Error(result.error);
  revalidateAccounting(customerId);
}

export async function postOrderToCurrentAccountAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.createTransaction');
  const customerId = getText(formData, 'customer_id');
  const orderId = getText(formData, 'order_id');
  const dueDate = getOptionalDate(formData, 'due_date');

  if (!orderId) {
    throw new Error('Siparişi cariye işlemek için sipariş zorunludur.');
  }

  const result = await postOrderToAccount(orderId, { actorUserId: session.user.id, dueDate });
  if (!result.ok) throw new Error('Sipariş cariye işlenemedi.');
  revalidateAccounting(customerId);
}

export async function cancelOrderInCurrentAccountAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.reverseTransaction');
  const customerId = getText(formData, 'customer_id');
  const orderId = getText(formData, 'order_id');

  if (!orderId) {
    throw new Error('Sipariş iptali için sipariş zorunludur.');
  }

  const result = await cancelOrderInAccount(orderId, { actorUserId: session.user.id });
  if (!result.ok) throw new Error('Sipariş iptali cariye işlenemedi.');
  revalidateAccounting(customerId);
}

export async function adjustBalanceAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.createTransaction');
  const customerId = getText(formData, 'customer_id');
  const amount = getNumber(formData, 'amount');
  const description = getText(formData, 'description');
  const dueDate = getOptionalDate(formData, 'due_date');

  if (!customerId || !description || amount === 0) {
    throw new Error('Müşteri ve açıklama zorunludur.');
  }

  const result = await adjustBalance(customerId, {
    amount,
    description,
    dueDate,
    idempotencyKey: `adjustment:${randomUUID()}`,
  }, { actorUserId: session.user.id });
  if (!result.ok) throw new Error('Bakiye düzeltilemedi.');
  revalidateAccounting(customerId);
}

export async function updateCustomerRiskLimitAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.manageRiskLimit');
  const customerId = getText(formData, 'customer_id');
  const riskLimit = getNumber(formData, 'risk_limit');
  const riskPolicy = getText(formData, 'risk_policy');
  const warningThreshold = getNumber(formData, 'warning_threshold');

  if (!customerId || riskLimit < 0) {
    throw new Error('Müşteri ve sıfırdan küçük olmayan risk limiti zorunludur.');
  }
  if (!['warn', 'require_approval', 'block'].includes(riskPolicy)) throw new Error('Geçersiz risk politikası.');
  if (!Number.isInteger(warningThreshold) || warningThreshold < 1 || warningThreshold > 100) {
    throw new Error('Uyarı eşiği 1 ile 100 arasında bir tam sayı olmalıdır.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('update_customer_risk_settings', {
    p_customer_id: customerId,
    p_risk_limit: riskLimit,
    p_risk_policy: riskPolicy,
    p_warning_threshold: warningThreshold,
    p_actor_user_id: session.user.id,
  });
  if (error) throw new Error(error.message);
  revalidateAccounting(customerId);
  revalidatePath('/admin/customers');
}

export async function approveOrderRiskAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.manageRiskLimit');
  const orderId = getText(formData, 'order_id');
  const customerId = getText(formData, 'customer_id');
  if (!orderId) throw new Error('Sipariş zorunludur.');

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('approve_order_risk', {
    p_order_id: orderId,
    p_actor_user_id: session.user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/orders');
  revalidateAccounting(customerId || undefined);
}

export async function updateCustomerPaymentTermsAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.editDueDate');
  const customerId = getText(formData, 'customer_id');
  const paymentTermDays = getNumber(formData, 'payment_term_days');

  if (!customerId || !Number.isInteger(paymentTermDays) || paymentTermDays < 0 || paymentTermDays > 365) {
    throw new Error('Ödeme vadesi 0 ile 365 gün arasında bir tam sayı olmalıdır.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('update_customer_payment_terms', {
    p_customer_id: customerId,
    p_payment_term_days: paymentTermDays,
    p_actor_user_id: session.user.id,
  });
  if (error) throw new Error(error.message);
  revalidateAccounting(customerId);
}

export async function updateTransactionDueDateAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('account.editDueDate');
  const customerId = getText(formData, 'customer_id');
  const transactionId = getText(formData, 'transaction_id');
  const dueDate = getOptionalDate(formData, 'due_date');

  if (!transactionId || !dueDate) {
    throw new Error('Cari hareket ve vade tarihi zorunludur.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('set_account_transaction_due_date', {
    p_transaction_id: transactionId,
    p_due_date: dueDate,
    p_reason: getText(formData, 'reason'),
    p_actor_user_id: session.user.id,
  });
  if (error) throw new Error(error.message);
  revalidateAccounting(customerId);
}

export async function sendPaymentReminderAction(formData: FormData) {
  const session = await requireAdminPermission('account.sendPaymentReminder');
  const customerId = getText(formData, 'customer_id');
  if (!customerId) return { ok: false, message: 'Müşteri bilgisi eksik.' };

  const { sendManualPaymentReminder } = await import('@/lib/sms/payment-notifications');
  const result = await sendManualPaymentReminder(customerId, session.user.id);
  revalidateAccounting(customerId);
  return {
    ok: result.ok,
    message: result.ok ? 'Ödeme hatırlatması gönderildi.' : 'Ödeme hatırlatması gönderilemedi.',
  };
}

export async function createStatementAction(formData: FormData): Promise<void> {
  await requireAdminPermission('account.viewStatement');
  const customerId = getText(formData, 'customer_id');

  if (customerId) {
    redirect(`/admin/cari/ekstreler?customer=${customerId}`);
  }

  redirect('/admin/accounting/ekstreler');
}
