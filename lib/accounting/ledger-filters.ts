import type { AccountTransactionType } from '@/lib/catalog/types';
import type { CustomerLedgerFilters } from '@/lib/accounting/types';

export const CUSTOMER_LEDGER_PAGE_SIZE = 25;

export const ACCOUNT_TRANSACTION_TYPES: AccountTransactionType[] = [
  'ORDER',
  'PAYMENT',
  'PARTIAL_PAYMENT',
  'REFUND',
  'ADJUSTMENT',
  'CANCELLATION',
  'OPENING_BALANCE',
];

export function isAccountTransactionType(value: string): value is AccountTransactionType {
  return ACCOUNT_TRANSACTION_TYPES.includes(value as AccountTransactionType);
}

export type CustomerLedgerSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseDate(value: string | string[] | undefined) {
  const candidate = first(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return undefined;
  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate ? undefined : candidate;
}

export function parseCustomerLedgerFilters(params: CustomerLedgerSearchParams): CustomerLedgerFilters {
  const query = first(params.ledgerQuery).trim().slice(0, 120);
  const type = first(params.ledgerType) as AccountTransactionType;
  const parsedPage = Number.parseInt(first(params.ledgerPage), 10);
  const fromDate = parseDate(params.ledgerFrom);
  const toDate = parseDate(params.ledgerTo);

  return {
    query: query || undefined,
    type: isAccountTransactionType(type) ? type : undefined,
    fromDate,
    toDate: fromDate && toDate && toDate < fromDate ? undefined : toDate,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: CUSTOMER_LEDGER_PAGE_SIZE,
  };
}

export function buildCustomerLedgerHref(customerId: string, filters: CustomerLedgerFilters, page: number) {
  const params = new URLSearchParams({ tab: 'transactions' });
  if (filters.query) params.set('ledgerQuery', filters.query);
  if (filters.type) params.set('ledgerType', filters.type);
  if (filters.fromDate) params.set('ledgerFrom', filters.fromDate);
  if (filters.toDate) params.set('ledgerTo', filters.toDate);
  if (page > 1) params.set('ledgerPage', String(page));
  return `/admin/accounting/${encodeURIComponent(customerId)}?${params.toString()}`;
}
