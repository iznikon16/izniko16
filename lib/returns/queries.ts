import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { OrderItemRow, OrderRow, RefundTransactionRow, ReturnItemRow, ReturnRequestRow, ReturnStatusHistoryRow } from '@/lib/catalog/types';
import type { ReturnRecord } from '@/lib/returns/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function hydrateReturns(client: SupabaseClient<Database>, returns: ReturnRequestRow[]): Promise<ReturnRecord[]> {
  if (returns.length === 0) return [];
  const returnIds = returns.map((item) => item.id);
  const orderIds = [...new Set(returns.map((item) => item.order_id))];
  const userIds = [...new Set(returns.map((item) => item.user_id))];
  const [{ data: items, error: itemsError }, { data: history, error: historyError }, { data: refunds, error: refundsError }, { data: orders, error: ordersError }, { data: orderItems, error: orderItemsError }, { data: customers, error: customersError }] = await Promise.all([
    client.from('return_items').select('*').in('return_request_id', returnIds),
    client.from('return_status_history').select('*').in('return_request_id', returnIds).order('created_at', { ascending: false }),
    client.from('refund_transactions').select('*').in('return_request_id', returnIds),
    client.from('orders').select('*').in('id', orderIds),
    client.from('order_items').select('*').in('order_id', orderIds),
    client.from('customer_profiles').select('user_id,email,full_name,phone').in('user_id', userIds),
  ]);
  const error = itemsError ?? historyError ?? refundsError ?? ordersError ?? orderItemsError ?? customersError;
  if (error) throw new Error(error.message);

  const orderById = new Map(((orders ?? []) as OrderRow[]).map((item) => [item.id, item]));
  const orderItemById = new Map(((orderItems ?? []) as OrderItemRow[]).map((item) => [item.id, item]));
  const refundByReturnId = new Map(((refunds ?? []) as RefundTransactionRow[]).map((item) => [item.return_request_id, item]));
  const customerById = new Map((customers ?? []).map((item) => [item.user_id, item]));
  return returns.map((request) => ({
    ...request,
    customer: customerById.get(request.user_id) ?? null,
    history: ((history ?? []) as ReturnStatusHistoryRow[]).filter((entry) => entry.return_request_id === request.id),
    items: ((items ?? []) as ReturnItemRow[]).filter((entry) => entry.return_request_id === request.id).map((entry) => ({ ...entry, orderItem: orderItemById.get(entry.order_item_id) ?? null })),
    order: orderById.get(request.order_id) ?? null,
    refund: refundByReturnId.get(request.id) ?? null,
  }));
}

export async function getCustomerReturns(userId: string) {
  const client = await createClient();
  const { data, error } = await client.from('return_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return hydrateReturns(client, (data ?? []) as ReturnRequestRow[]);
}

export async function getAdminReturns() {
  const client = createAdminClient();
  const { data, error } = await client.from('return_requests').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return hydrateReturns(client, (data ?? []) as ReturnRequestRow[]);
}
