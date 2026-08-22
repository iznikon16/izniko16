'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { requireCustomerSession } from '@/lib/commerce/queries';
import { confirmExternalReturnRefund, processReturnRefund } from '@/lib/returns/refund-processor';
import { isReturnStatus } from '@/lib/returns/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function text(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim(); }
function revalidateReturns() {
  revalidatePath('/admin/returns');
  revalidatePath('/hesabim/iadelerim');
  revalidatePath('/hesabim/siparislerim');
}

export async function createReturnRequestAction(formData: FormData) {
  await requireCustomerSession('/hesabim/iadelerim');
  const orderId = text(formData, 'order_id');
  const reason = text(formData, 'reason');
  const items = Array.from(formData.entries()).filter(([key]) => key.startsWith('quantity:')).map(([key,value]) => ({ order_item_id: key.slice(9), quantity: Number(value) })).filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);
  if (!orderId || !reason || items.length === 0) throw new Error('Sipariş, iade nedeni ve en az bir ürün zorunludur.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_return_request', { p_customer_note: text(formData,'customer_note'), p_items: items, p_order_id: orderId, p_reason: reason });
  if (error) throw new Error(error.message);
  revalidateReturns();
}

export async function transitionReturnRequestAction(formData: FormData) {
  const session = await requireAdminPermission('return.manage');
  const returnId = text(formData,'return_id');
  const status = text(formData,'status');
  if (!returnId || !isReturnStatus(status)) throw new Error('İade durumu geçersiz.');
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('transition_return_request', { p_actor_user_id: session.user.id, p_admin_note: text(formData,'admin_note'), p_return_request_id: returnId, p_status: status });
  const result = data?.[0];
  if (error || !result) throw new Error(error?.message ?? 'İade durumu güncellenemedi.');
  try {
    if (status === 'refund_pending' && result.refund_transaction_id) await processReturnRefund(result.refund_transaction_id, session.user.id);
  } finally {
    revalidateReturns();
  }
}

export async function confirmExternalRefundAction(formData: FormData) {
  const session = await requireAdminPermission('return.manage');
  await confirmExternalReturnRefund(text(formData,'refund_id'), session.user.id, text(formData,'provider_reference'));
  revalidateReturns();
}

export async function retryReturnRefundAction(formData: FormData) {
  const session = await requireAdminPermission('return.manage');
  await processReturnRefund(text(formData,'refund_id'), session.user.id);
  revalidateReturns();
}
