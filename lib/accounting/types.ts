import type {
  AccountTransactionRow,
  AdminCustomerRecord,
  CustomerAccountRow,
  CustomerProfileRow,
  OrderRow,
  PaymentRow,
} from '@/lib/catalog/types';

/**
 * Cari hesaba ait hesaplanmış finansal özet.
 * Tüm değerler ledger (account_transactions) üzerinden türetilir;
 * müşteri üzerinde mutable sayı olarak tutulmaz.
 */
export type CustomerAccountSummary = {
  /** Açık bakiye (borç) — debit - credit toplamı. Pozitif = borçlu. */
  balance: number;
  /** Toplam borç (debit toplamı) */
  totalDebit: number;
  /** Toplam tahsilat (credit toplamı) */
  totalCredit: number;
  /** Vadesi geçmiş açık bakiye */
  overdueBalance: number;
  /** Bugün vadesi gelen tutar */
  dueToday: number;
  /** Risk limiti */
  riskLimit: number;
  /** Kullanılabilir limit (riskLimit - balance) */
  availableLimit: number;
  /** Son hareket tarihi */
  lastTransactionAt: string | null;
  /** Son tahsilat tarihi */
  lastPaymentAt: string | null;
};

export type AccountTransactionWithOrder = AccountTransactionRow & {
  order: Pick<OrderRow, 'id' | 'order_number' | 'total' | 'status'> | null;
};

export type PaymentWithOrder = PaymentRow & {
  order: Pick<OrderRow, 'id' | 'order_number' | 'total'> | null;
};

export type CustomerAccountRecord = CustomerAccountRow & {
  customer: Pick<CustomerProfileRow, 'user_id' | 'email' | 'full_name' | 'phone' | 'is_blocked' | 'is_vip'> | null;
  summary: CustomerAccountSummary;
};

export type AdminCustomerAccountRecord = {
  customer: AdminCustomerRecord | null;
  account: CustomerAccountRow | null;
  balance: number;
  riskLimit: number;
  availableLimit: number;
  overdueBalance: number;
  usedPercent: number;
};

export type AccountStatementLine = {
  id: string;
  date: string;
  documentNo: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  dueDate: string | null;
  type: AccountTransactionRow['type'];
  isReversal: boolean;
};

export type AccountStatement = {
  customer: Pick<CustomerProfileRow, 'user_id' | 'email' | 'full_name' | 'phone'> | null;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: AccountStatementLine[];
};

export type OverduePayment = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string | null;
  orderNumber: string | null;
  total: number;
  collected: number;
  remaining: number;
  dueDate: string | null;
  overdueDays: number;
  description: string;
};

export const ACCOUNT_TRANSACTION_LABELS: Record<AccountTransactionRow['type'], string> = {
  ORDER: 'Sipariş',
  PAYMENT: 'Tahsilat',
  PARTIAL_PAYMENT: 'Kısmi Tahsilat',
  REFUND: 'İade',
  ADJUSTMENT: 'Düzeltme',
  CANCELLATION: 'İptal',
  OPENING_BALANCE: 'Açılış Bakiyesi',
};

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  order_in: 'Sipariş Girişi',
  order_out: 'Sipariş Çıkışı',
  xml_update: 'XML Güncelleme',
  manual_in: 'Manuel Giriş',
  manual_out: 'Manuel Çıkış',
  order_cancel: 'Sipariş İptali',
};
