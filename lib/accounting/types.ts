import type {
  AccountTransactionType,
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

export type CustomerAccountListBalanceFilter = 'debtor' | 'creditor';
export type CustomerAccountListStatusFilter = 'active' | 'inactive';

export type CustomerAccountListFilters = {
  query?: string;
  balance?: CustomerAccountListBalanceFilter;
  overdue?: boolean;
  riskExceeded?: boolean;
  status?: CustomerAccountListStatusFilter;
  page: number;
  pageSize: number;
};

export type CustomerAccountListItem = {
  customerId: string;
  accountId: string | null;
  customerName: string;
  email: string;
  phone: string;
  accountCode: string;
  isActive: boolean;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  overdueBalance: number;
  riskLimit: number;
  availableLimit: number;
  riskExceeded: boolean;
  lastTransactionAt: string | null;
};

export type CustomerAccountListMetrics = {
  customerCount: number;
  totalReceivable: number;
  totalCustomerCredit: number;
  totalOverdue: number;
};

export type CustomerAccountListPage = {
  items: CustomerAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: CustomerAccountListMetrics;
};

export type CustomerAccountDetail = {
  summary: CustomerAccountListItem;
  paymentTermDays: number;
  riskPolicy: 'warn' | 'require_approval' | 'block';
  riskWarningThreshold: number;
  riskUsagePercent: number;
  ledgerExposure: number;
  unpostedOrderExposure: number;
  priceList: {
    code: string;
    name: string;
  } | null;
  openOrderAmount: number;
  upcomingDueAmount: number;
  usedLimit: number;
  lastPaymentAt: string | null;
  recentTransactions: Pick<
    AccountTransactionRow,
    'id' | 'type' | 'reference' | 'description' | 'debit' | 'credit' | 'balance_after' | 'due_date' | 'created_at'
  >[];
  recentPayments: Pick<PaymentRow, 'id' | 'amount' | 'paid_at' | 'payment_method' | 'reference_number' | 'status'>[];
  upcomingDueItems: Array<{
    id: string;
    reference: string;
    description: string;
    dueDate: string;
    openAmount: number;
  }>;
  dueItems: DueReceivable[];
};

export type CustomerLedgerFilters = {
  query?: string;
  type?: AccountTransactionType;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
};

export type CustomerLedgerItem = {
  id: string;
  transactionNumber: string;
  type: AccountTransactionType;
  reference: string;
  description: string;
  dueDate: string | null;
  debit: number;
  credit: number;
  balanceAfter: number;
  actorUserId: string | null;
  actorName: string;
  orderNumber: string | null;
  isReversal: boolean;
  reversedTransactionId: string | null;
  createdAt: string;
};

export type CustomerLedgerPage = {
  items: CustomerLedgerItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CustomerTransactionBreakdown = {
  type: AccountTransactionType;
  transactionCount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  lastTransactionAt: string | null;
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
  accountCode: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: AccountStatementLine[];
};

export type DueReceivableStatus = 'OPEN' | 'APPROACHING' | 'DUE_TODAY' | 'OVERDUE' | 'PARTIAL_PAID' | 'PAID';

export type DueReceivable = {
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string | null;
  orderNumber: string | null;
  total: number;
  collected: number;
  remaining: number;
  dueDate: string | null;
  remainingDays: number;
  overdueDays: number;
  status: DueReceivableStatus;
  reference: string;
  description: string;
};

export type OverduePayment = DueReceivable;

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
