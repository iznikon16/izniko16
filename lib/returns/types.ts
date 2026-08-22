import type { CustomerProfileRow, OrderItemRow, OrderRow, RefundTransactionRow, ReturnItemRow, ReturnRequestRow, ReturnStatusHistoryRow } from '@/lib/catalog/types';

export const RETURN_STATUSES = ['requested','approved','rejected','received','refund_pending','refunded','completed'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_STATUS_LABELS: Record<ReturnStatus,string> = {
  requested: 'Talep Edildi', approved: 'Onaylandı', rejected: 'Reddedildi', received: 'Ürün Kabul Edildi',
  refund_pending: 'Geri Ödeme Bekliyor', refunded: 'Geri Ödendi', completed: 'Tamamlandı',
};
export const RETURN_NEXT_STATUSES: Record<ReturnStatus,ReturnStatus[]> = {
  requested: ['approved','rejected'], approved: ['received','rejected'], rejected: [], received: ['refund_pending'],
  refund_pending: [], refunded: ['completed'], completed: [],
};
export function isReturnStatus(value: string): value is ReturnStatus { return (RETURN_STATUSES as readonly string[]).includes(value); }

export type ReturnRecord = ReturnRequestRow & {
  customer: Pick<CustomerProfileRow, 'email' | 'full_name' | 'phone'> | null;
  history: ReturnStatusHistoryRow[];
  items: Array<ReturnItemRow & { orderItem: OrderItemRow | null }>;
  order: OrderRow | null;
  refund: RefundTransactionRow | null;
};
