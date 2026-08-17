'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/admin';
import {
  adjustBalance,
  cancelOrderInAccount,
  collectPayment,
  postOrderToAccount,
  reversePayment,
  updateRiskLimit,
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

function revalidateAccounting() {
  revalidatePath('/admin');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/accounting/tahsilatlar');
  revalidatePath('/admin/accounting/hareketler');
  revalidatePath('/admin/accounting/ekstreler');
  revalidatePath('/admin/accounting/geciken-odemeler');
  revalidatePath('/admin/customers');
}

export async function collectPaymentAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const amount = getNumber(formData, 'amount');
  const orderId = getText(formData, 'order_id') || null;

  if (!customerId || amount <= 0) {
    throw new Error('Geçerli bir müşteri ve tahsilat tutarı girin.');
  }

  await collectPayment(
    customerId,
    {
      amount,
      paidAt: getOptionalDate(formData, 'paid_at') ?? new Date().toISOString(),
      paymentMethod: getText(formData, 'payment_method') || 'manual',
      referenceNumber: getText(formData, 'reference_number'),
      description: getText(formData, 'description'),
      orderId,
      provider: 'manual',
      idempotencyKey: `payment:${randomUUID()}`,
    }
  );

  revalidateAccounting();
}

export async function reversePaymentAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const paymentId = getText(formData, 'payment_id');

  if (!customerId || !paymentId) {
    throw new Error('Tahsilat bilgileri eksik.');
  }

  await reversePayment(customerId, paymentId);
  revalidateAccounting();
}

export async function postOrderToCurrentAccountAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const orderId = getText(formData, 'order_id');
  const total = getNumber(formData, 'total');
  const dueDate = getOptionalDate(formData, 'due_date');

  if (!customerId || !orderId || total <= 0) {
    throw new Error('Siparişi cariye işlemek için müşteri, sipariş ve tutar zorunludur.');
  }

  await postOrderToAccount(customerId, { id: orderId, total, dueDate });
  revalidateAccounting();
}

export async function cancelOrderInCurrentAccountAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const orderId = getText(formData, 'order_id');
  const total = getNumber(formData, 'total');

  if (!customerId || !orderId || total <= 0) {
    throw new Error('Sipariş iptali için müşteri, sipariş ve tutar zorunludur.');
  }

  await cancelOrderInAccount(customerId, { id: orderId, total });
  revalidateAccounting();
}

export async function adjustBalanceAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const amount = getNumber(formData, 'amount');
  const description = getText(formData, 'description');
  const dueDate = getOptionalDate(formData, 'due_date');

  if (!customerId || !description) {
    throw new Error('Müşteri ve açıklama zorunludur.');
  }

  await adjustBalance(customerId, {
    amount,
    description,
    dueDate,
    idempotencyKey: `adjustment:${randomUUID()}`,
  });
  revalidateAccounting();
}

export async function updateCustomerRiskLimitAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');
  const riskLimit = getNumber(formData, 'risk_limit');

  if (!customerId) {
    throw new Error('Müşteri zorunludur.');
  }

  await updateRiskLimit(customerId, riskLimit);
  revalidateAccounting();
  revalidatePath('/admin/customers');
}

export async function createStatementAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const customerId = getText(formData, 'customer_id');

  if (customerId) {
    redirect(`/admin/cari/ekstreler?customer=${customerId}`);
  }

  redirect('/admin/accounting/ekstreler');
}
